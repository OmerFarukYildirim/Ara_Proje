from fastapi import FastAPI, Depends, HTTPException, Security
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from elasticsearch import Elasticsearch
import models # models.py dosyamız
from config import settings
from typing import List, Dict, Any, Optional
import json
import httpx # YENİ: Recommender'ı çağırmak için
from aiokafka import AIOKafkaProducer
import asyncio
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- YENİ: CORS Middleware ---
# API route'larından ÖNCE eklenmeli
app.add_middleware(
    CORSMiddleware,
    # React uygulamasının adresini yazmalısın. Test için "*" (hepsi)
    # production'da "http://localhost:3000" veya "https://seninsiten.com" gibi olmalı.
    allow_origins=["*"],

    # Kimlik bilgileri (cookie, token vb.) için True
    allow_credentials=True,

    # Tüm metodlara (GET, POST, OPTIONS vb.) izin ver
    allow_methods=["*"],

    # İzin verilen tüm başlıklar.
    # X-API-Key ve Authorization için bu şart.
    allow_headers=["*"],
)
# --- CORS Bitiş ---

# --- Global Değişkenler ---
MIN_UNREAD_THRESHOLD = 3 #
# YENİ: Her kategoriden en fazla kaç haber getirelim?
MAX_NEWS_PER_CATEGORY = 5
# YENİ: Kullanıcıya en fazla kaç haber gösterelim (Paging için temel)
TOTAL_FEED_LIMIT = 20

kafka_producer: Optional[AIOKafkaProducer] = None
es: Optional[Elasticsearch] = None
# YENİ: Recommender (Go) servisi için HTTP Client
recommender_client: Optional[httpx.AsyncClient] = None

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def validate_api_key(api_key: str = Security(api_key_header)):
    """
    Gelen isteğin header'ındaki 'X-API-Key'i .env'deki
    'TRUSTED_API_KEY' ile karşılaştıran güvenlik bağımlılığı.
    """
    if not api_key or api_key != settings.trusted_api_key:
        raise HTTPException(
            status_code=401,
            detail="Geçersiz veya eksik API Key"
        )
    return api_key

# --- BAĞLANTILAR (Clean Code: Startup / Shutdown) ---
@app.on_event("startup")
async def startup_event():
    """Uygulama başladığında dış bağlantıları kurar."""
    global es, kafka_producer, recommender_client

    # 1. Elasticsearch Bağlantısı
    try:
        es = Elasticsearch(settings.elasticsearch_url)
        es.ping()
        print(f"[content-finder] Elasticsearch'e {settings.elasticsearch_url} adresine bağlandı.")
    except Exception as e:
        print(f"[content-finder] Elasticsearch bağlantı hatası: {e}")
        es = None

    # 2. Kafka Producer (Yayıncı) Bağlantısı
    try:
        kafka_producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers
        )
        await kafka_producer.start()
        print(f"[content-finder] Kafka Producer {settings.kafka_brokers} adresine bağlandı.")
    except Exception as e:
        print(f"[content-finder] Kafka Producer bağlantı hatası: {e}")
        kafka_producer = None

    # 3. YENİ: Recommender (Go) Client Bağlantısı
    try:
        recommender_client = httpx.AsyncClient(
            base_url=settings.recommender_service_url,
            headers={
                "X-API-Key": settings.trusted_api_key #
            },
            timeout=10.0
        )
        print(f"[content-finder] Recommender-service client'ı {settings.recommender_service_url} için kuruldu.")
    except Exception as e:
        print(f"Recommender client hatası: {e}")
        recommender_client = None

@app.on_event("shutdown")
async def shutdown_event():
    """Uygulama kapandığında bağlantıları kapatır."""
    if kafka_producer:
        await kafka_producer.stop()
        print("[content-finder] Kafka Producer bağlantısı kapatıldı.")
    if es:
        es.close()
        print("[content-finder] Elasticsearch bağlantısı kapatıldı.")
    if recommender_client:
        await recommender_client.aclose()
        print("[content-finder] Recommender-service client'ı kapatıldı.")

def get_db():
    """PostgreSQL oturum (session) bağımlılığı"""
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- YARDIMCI FONKSİYONLAR ---

async def send_kafka_request(category: str):
    """Kafka'ya (Asenkron) haber talebi yollar"""
    if not kafka_producer:
        print(f"Hata: Kafka producer hazır değil, '{category}' talebi atlanıyor.")
        return

    print(f"[content-finder] Kategori '{category}' için Kafka'ya talep yollanıyor...")
    try:
        message = {"category": category}
        message_bytes = json.dumps(message).encode("utf-8")

        await kafka_producer.send_and_wait(
            settings.kafka_topic_news_request,
            message_bytes
        )
        print(f"[content-finder] Kafka'ya '{category}' talebi başarıyla iletildi.")
    except Exception as e:
        print(f"[content-finder] Kafka'ya mesaj iletilemedi: {e}")

def get_unread_news_from_es(user_id: str, category: str, db: Session) -> List[Dict[str, Any]]:
    """Belirli bir kategori için ES'ten okunmamış haberleri çeker"""

    # 1. Postgres'ten (UserReads) okunan haber ID'lerini al
    read_news_records = db.query(models.UserReadHistory.news_id).filter(
        models.UserReadHistory.user_id == user_id
    ).all()
    read_news_ids = [record[0] for record in read_news_records]

    # 2. ES Sorgusu: 'must_not' (okunanlar) VE 'filter' (kategori)
    search_body = {
        "size": MAX_NEWS_PER_CATEGORY, # Her kategoriden en fazla 5 al
        "query": {
            "bool": {
                "must_not": [{"ids": {"values": read_news_ids}}],
                "filter": [{"term": {"category.keyword": category}}]
            }
        },
        "sort": [{"id.keyword": "desc"}]
    }

    try:
        response = es.search(index="news_articles", body=search_body)
        hits = response.get("hits", {}).get("hits", [])
        return [hit["_source"] for hit in hits]
    except Exception as e:
        print(f"Elasticsearch arama hatası (Kategori: {category}): {e}")
        return [] # Hata olursa boş liste dön

# --- API ENDPOINT 1 (Değişiklik yok) ---

# --- Pydantic Modelleri (Değişiklik yok) ---
class ReadHistoryInput(BaseModel):
    user_id: str
    news_id: str

# --- API ENDPOINT 1 (GÜNCELLENDİ) ---
@app.post("/api/track-read", dependencies=[Depends(validate_api_key)])
def track_read_history(item: ReadHistoryInput, db: Session = Depends(get_db)):
    """
    (KORUMALI) Frontend'den gelen "bu haberi okudu" bilgisini PostgreSQL'e kaydeder.
    """
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


# --- API ENDPOINT 2 (GÜNCELLENDİ) ---
@app.get("/api/feed/{user_id}", dependencies=[Depends(validate_api_key)])
async def get_personalized_feed(
        user_id: str,
        db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    (KORUMALI) Kullanıcının skorlarına göre kişiselleştirilmiş bir 'feed' oluşturur.
    """
    """
    Kullanıcının skorlarına göre kişiselleştirilmiş bir 'feed' oluşturur.
    1. Recommender'dan (Go) sıralı kategorileri alır.
    2. Her kategori için ES'ten okunmamış haberleri arar.
    3. Yetersizse, Kafka'ya (asenkron) talep yollar.
    4. Bulabildiklerini anında kullanıcıya döner.
    """

    if not es or not kafka_producer or not recommender_client:
        raise HTTPException(503, "Harici servisler (ES, Kafka, Recommender) düzgün başlatılamadı.")

    # --- 1. Adım: Recommender'dan (Go) Sıralı Kategorileri Al ---
    try:
        response = await recommender_client.get(f"/api/recommendations/{user_id}")
        response.raise_for_status() # 4xx/5xx hata varsa
        data = response.json()
        ranked_categories = data.get("categories", [])
        if not ranked_categories:
            raise HTTPException(404, "Kullanıcı skorları bulunamadı veya boş.")
        print(f"[content-finder] UserID {user_id} için sıralı kategoriler alındı: {ranked_categories}")

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(404, "Kullanıcı skorları (recommender) bulunamadı.")
        raise HTTPException(503, f"Recommender servisine ulaşılamadı: {e}")
    except Exception as e:
        raise HTTPException(500, f"Recommender'dan yanıt işlenemedi: {e}")

    # --- 2. Adım: Kategorileri Döngüye Al ve Haberleri Topla ---
    final_feed: List[Dict[str, Any]] = []

    # Arka planda çalışacak Kafka taleplerini topla
    kafka_tasks = []

    # Not: Bu döngü 'sync' (ES ve DB sorguları) çalışır.
    # FastAPI, 'def' fonksiyonlarını otomatik olarak thread pool'da çalıştırır.
    for category in ranked_categories:
        # Toplam haber limitini aştıysak dur
        if len(final_feed) >= TOTAL_FEED_LIMIT:
            break

        # 1. Bu kategori için okunmamış haberleri çek
        unread_news = get_unread_news_from_es(user_id, category, db)

        # 2. Yeterli haber var mı diye bak
        if len(unread_news) >= MIN_UNREAD_THRESHOLD:
            print(f"[content-finder] Kategori '{category}' için {len(unread_news)} adet yeterli haber bulundu.")
            # Limiti aşmayacak kadarını ekle
            needed = TOTAL_FEED_LIMIT - len(final_feed)
            final_feed.extend(unread_news[:needed])
        else:
            # 3. Yeterli haber yoksa, Kafka'ya (asenkron) talep yolla
            # 'await' KULLANMIYORUZ! Kullanıcıyı bekletmemek için
            # talebi "ateşle ve unut" (fire-and-forget) yapıyoruz.
            task = asyncio.create_task(send_kafka_request(category))
            kafka_tasks.append(task)

            # Elimizdeki az sayıdaki haberi yine de ekle
            if len(unread_news) > 0:
                needed = TOTAL_FEED_LIMIT - len(final_feed)
                final_feed.extend(unread_news[:needed])

    # 4. Adım: Bulunanları Kullanıcıya Hemen Dön
    if not final_feed:
        # Eğer HİÇ haber bulamadıysak (ve Kafka talepleri yoldaysak)
        # kullanıcıya "birazdan tekrar dene" mesajı dönmek daha iyi olabilir.
        raise HTTPException(202, "Feed'iniz oluşturuluyor. Lütfen birkaç dakika sonra tekrar deneyin.")

    return final_feed