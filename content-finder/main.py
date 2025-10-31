from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from elasticsearch import Elasticsearch
import models # models.py dosyamız
from config import settings
from typing import List, Dict, Any, Optional # <-- 'Optional' eklendi
import httpx # <-- YENİ IMPORT

app = FastAPI()

# --- YENİ AYARLAR ---
# Yetersiz haber sınırı (bu sayının altındaysa fetcher'ı tetikle)
MIN_UNREAD_THRESHOLD = 3

# --- Bağlantılar ---
def get_db():
    """PostgreSQL oturum (session) bağımlılığı"""
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Elasticsearch bağlantısı
try:
    es = Elasticsearch(settings.elasticsearch_url)
    es.ping()
    print("[content-finder] Elasticsearch'e başarıyla bağlandı.")
except Exception as e:
    print(f"[content-finder] Elasticsearch bağlantı hatası: {e}")
    es = None

# YENİ: Fetcher-service'i (Java) çağırmak için Asenkron HTTP Client
# Bu client'ı global olarak tanımlıyoruz ki bağlantıları yeniden kullanabilsin
try:
    fetcher_client = httpx.AsyncClient(
        base_url=settings.fetcher_service_url,
        timeout=120.0 # Java + AI + ES kaydı yavaş olabilir, timeout yüksek
    )
    print(f"[content-finder] Fetcher-service client'ı {settings.fetcher_service_url} için kuruldu.")
except Exception as e:
    print(f"Fetcher client hatası: {e}")
    fetcher_client = None

# --- Pydantic Modelleri (Değişiklik yok) ---
class ReadHistoryInput(BaseModel):
    user_id: str
    news_id: str

# --- API ENDPOINT 1 (Değişiklik yok) ---
@app.post("/api/track-read")
def track_read_history(item: ReadHistoryInput, db: Session = Depends(get_db)):
    """
    Frontend'den gelen "bu haberi okudu" bilgisini PostgreSQL'e kaydeder.
    (Bu endpoint senkron kalabilir, network I/O yapmıyor)
    """
    # ... (bu fonksiyonun kodu aynı, değişiklik yok) ...
    new_record = models.UserReadHistory(
        user_id=item.user_id,
        news_id=item.news_id
    )
    try:
        db.add(new_record)
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "already_exists"}
    return {"status": "success", "user_id": item.user_id, "news_id": item.news_id}


# --- API ENDPOINT 2 (TAMAMEN GÜNCELLENDİ) ---
@app.get("/api/feed/{user_id}")
async def get_user_feed(
        user_id: str,
        category: str,  # <-- YENİ: Query param olarak (?category=technology)
        db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Kullanıcıya okunmamış haberleri getirir. Kategoriye göre filtreler.
    Yeterli haber yoksa, fetcher-service'i tetikler ve tekrar dener.
    """

    if not es or not fetcher_client:
        raise HTTPException(503, "Harici servisler (ES veya Fetcher) düzgün başlatılamadı.")

    # --- 1. İç Fonksiyon: Okunmamış Haberleri Getir ---
    # Bu fonksiyon hem başta hem de fetch sonrası çağrılacak
    def get_unread_news_from_db():
        # Postgres call (Sync - Blocking)
        # Not: FastAPI, sync fonksiyonları async endpoint içinde
        # otomatik olarak bir thread pool'da çalıştırır.
        read_news_records = db.query(models.UserReadHistory.news_id).filter(
            models.UserReadHistory.user_id == user_id
        ).all()
        read_news_ids = [record[0] for record in read_news_records]

        # ES Sorgusu: 'must_not' (okunanlar) VE 'filter' (kategori)
        search_body = {
            "size": 20,
            "query": {
                "bool": {
                    "must_not": [{"ids": {"values": read_news_ids}}],
                    "filter": [
                        # KATEGORİ FİLTRESİNİ EKLEDİK
                        {"term": {"category.keyword": category}}
                    ]
                }
            },
            "sort": [{"id.keyword": "desc"}] # .keyword'ü unutmuyoruz
        }

        try:
            # ES call (Sync - Blocking)
            response = es.search(index="news_articles", body=search_body)
            hits = response.get("hits", {}).get("hits", [])
            return [hit["_source"] for hit in hits]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Elasticsearch'ten veri çekilemedi: {e}")

    # --- 2. Ana Akış ---

    # 1. Deneme: Mevcut haberleri kontrol et
    unread_news = get_unread_news_from_db()

    # Yeterli haber varsa, hemen döndür
    if len(unread_news) >= MIN_UNREAD_THRESHOLD:
        print(f"[content-finder] Yeterli haber ({len(unread_news)}) bulundu. Cache'den sunuluyor.")
        return unread_news

    # 2. Deneme: Yeterli haber yok. Fetcher'ı (Java) tetikle.
    print(f"[content-finder] Yetersiz haber ({len(unread_news)}). Kategori '{category}' için Fetcher-service tetikleniyor...")
    try:
        # --- ASENKRON ÇAĞRI ---
        # Fetcher'ın /api/news endpoint'ine GET isteği at
        fetcher_response = await fetcher_client.get(
            "/api/news",
            params={"category": category} # ?category=...
        )
        fetcher_response.raise_for_status() # 4xx/5xx hata varsa
        print(f"[content-finder] Fetcher-service yanıtı: {fetcher_response.json()}")

    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        print(f"[content-finder] Fetcher-service'e ulaşılamadı veya hata verdi: {e}")
        # Fetcher başarısız olursa, en azından elimizdeki az sayıdaki haberi döndür
        return unread_news

    # 3. Deneme: Fetcher çalıştı. ES'i (ve Postgres'i) tekrar sorgula.
    print("[content-finder] Fetcher tamamlandı. Veritabanı tekrar sorgulanıyor.")

    final_unread_news = get_unread_news_from_db()
    return final_unread_news