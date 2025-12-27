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
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import uuid
import asyncio
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request

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
TOTAL_FEED_LIMIT = 80

kafka_producer: Optional[AIOKafkaProducer] = None
kafka_consumer: Optional[AIOKafkaConsumer] = None # YENİ: Cevap dinleyici
KAFKA_TOPIC_MIXED_REPLY = "mixed-feed-reply-topic"
KAFKA_TOPIC_UNMIXED_FEED = "unmixed-feed-topic"
pending_requests: Dict[str, asyncio.Future] = {}   # Cevap bekleyenler

es: Optional[Elasticsearch] = None
# YENİ: Recommender (Go) servisi için HTTP Client
recommender_client: Optional[httpx.AsyncClient] = None

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def safe_decode(value):
    """Değer byte ise decode eder, değilse olduğu gibi bırakır."""
    if isinstance(value, bytes):
        return value.decode('utf-8')
    return value

async def validate_api_key(request: Request, api_key: str = Security(api_key_header)):
    """
    DEBUG MODU: Gelen tüm başlıkları ve karşılaştırma sonucunu terminale basar.
    """
    # 1. Gelen Headerları Yazdır
    print("\n--- [DEBUG: AUTH KONTROLÜ] ---")
    print(f"Gelen URL: {request.url}")
    print(f"Gelen Method: {request.method}")
    print("TÜM HEADERLAR:")
    for key, value in request.headers.items():
        print(f"  - {key}: {value}")

    # 2. API Key Durumunu Yazdır
    print(f"Backend'in Beklediği Key (.env): {settings.trusted_api_key}")
    print(f"Frontend'den Gelen Key (Header): {api_key}")

    # 3. Kontrol
    if not api_key:
        print("❌ HATA: API Key hiç gelmedi (None). Tarayıcı veya Proxy silmiş.")
        raise HTTPException(status_code=401, detail="API Key Eksik (Server tarafına ulaşmadı)")

    if api_key != settings.trusted_api_key:
        print("❌ HATA: API Key geldi ama YANLIŞ. (.env ile uyuşmuyor)")
        print(f"  -> Gelen uzunluk: {len(api_key)}")
        print(f"  -> Beklenen uzunluk: {len(settings.trusted_api_key)}")
        raise HTTPException(status_code=401, detail="Geçersiz API Key")

    print("✅ BAŞARILI: API Key doğrulandı.")
    print("------------------------------\n")
    return api_key


# --- main.py DOSYASINDAKİ consume_replies FONKSİYONU ---

# --- main.py DOSYASINDAKİ consume_replies FONKSİYONU ---

async def consume_replies():
    """Spring Mixer servisinden dönen cevapları arka planda dinler."""
    global kafka_consumer
    
    async for msg in kafka_consumer:
        try:
            # Gelen başlıkları güvenli bir şekilde String'e çevirelim
            headers = {safe_decode(k): safe_decode(v) for k, v in msg.headers}
            
            # Gelen ID'yi String olarak al
            received_id = headers.get("correlation_id")

            # --- DEBUG LOG BAŞLANGICI ---
            target_ids = list(pending_requests.keys())
            print(f"[DEBUG CONSUMER] Topic: {msg.topic}, Received ID: {received_id}, Pending IDs: {target_ids}")
            # --- DEBUG LOG BİTİŞİ ---

            # Eşleşme kontrolü: received_id'nin tipinden bağımsız olarak kontrol ediyoruz.
            if received_id and received_id in pending_requests:
                # Eşleşme tamam!
                data = json.loads(msg.value.decode('utf-8'))
                future = pending_requests.pop(received_id)
                if not future.done():
                    future.set_result(data)
                    print(f"[content-finder] MÜKEMMEL: Mixer cevabı alındı ve eşleştirildi. ID: {received_id}")
            else: 
                print(f"EŞLEŞMEDİ! Received ID: '{received_id}' (Tip: {type(received_id)}, Uzunluk: {len(received_id or '')})")
                print(f"Target ID:   '{list(pending_requests.keys())[0]}' (Tip: {type(list(pending_requests.keys())[0])}, Uzunluk: {len(list(pending_requests.keys())[0] or '')})")

        except Exception as e:
            print(f"Reply dinleme hatası: {e}. Consumer çalışmaya devam ediyor.")
            continue

# --- BAĞLANTILAR (Clean Code: Startup / Shutdown) ---
@app.on_event("startup")
async def startup_event():
    global es, kafka_producer, kafka_consumer, recommender_client

    try:
        es = Elasticsearch(settings.elasticsearch_url)
        es.ping()
    except Exception as e:
        print(f"ES hatası: {e}")
        es = None

    try:
        kafka_producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_brokers)
        await kafka_producer.start()
    except Exception as e:
        print(f"Kafka Producer hatası: {e}")
        kafka_producer = None

    # YENİ: Mixer'den gelen cevapları dinlemek için Consumer
    try:
        kafka_consumer = AIOKafkaConsumer(
            # TOPIC LİSTESİ YERİNE SADECE BİR KEZ TOPIC VERİYORUZ
            KAFKA_TOPIC_MIXED_REPLY, 
            bootstrap_servers=settings.kafka_brokers,
            group_id="content-finder-reply-group",
            auto_offset_reset="earliest"
        )
        await kafka_consumer.start()
        
        # KRİTİK DÜZELTME: Consumer'ın Topic'e abone olduğundan emin olmak için 
        # AIOKafka'nın özel metodunu kullanıyoruz.
        topics = {KAFKA_TOPIC_MIXED_REPLY}
        
        # Abone olduğu partisyonlar gelene kadar bekler.
        # Bu, topic'in doğru olduğunu garanti etmenin en güvenli yoludur.
        while kafka_consumer.assignment() == set():
             print("[content-finder] Cevap Topic'ine abone olundu, atama bekleniyor...")
             await asyncio.sleep(0.5)

        print("[content-finder] Mixer Consumer başlatıldı ve Cevap Topic'i dinlemeye hazır.")

        asyncio.create_task(consume_replies())
    except Exception as e:
        print(f"Kafka Consumer hatası: {e}")
        kafka_consumer = None

    try:
        recommender_client = httpx.AsyncClient(
            base_url=settings.recommender_service_url,
            headers={"X-API-Key": settings.trusted_api_key},
            timeout=10.0
        )
    except:
        recommender_client = None
@app.on_event("shutdown")
async def shutdown_event():
    if kafka_producer: await kafka_producer.stop()
    if kafka_consumer: await kafka_consumer.stop() # YENİ
    if es: es.close()
    if recommender_client: await recommender_client.aclose()
def get_db():
    """PostgreSQL oturum (session) bağımlılığı"""
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- YARDIMCI FONKSİYONLAR ---

async def send_kafka_request(category: str, required_count: int):
    """Kafka'ya (Asenkron) haber talebi yollar"""
    if not kafka_producer:
        print(f"Hata: Kafka producer hazır değil, '{category}' talebi atlanıyor.")
        return

    print(f"[content-finder] Kategori '{category}' için Kafka'ya talep yollanıyor...")
    try:
        message = {"category": category, "count": required_count}
        message_bytes = json.dumps(message).encode("utf-8")

        await kafka_producer.send_and_wait(
            settings.kafka_topic_news_request,
            message_bytes
        )
        print(f"[content-finder] Kafka'ya '{category}' talebi başarıyla iletildi.")
    except Exception as e:
        print(f"[content-finder] Kafka'ya mesaj iletilemedi: {e}")

def get_unread_news_from_es(user_id: str, category: str, db: Session, limit: int) -> List[Dict[str, Any]]:
    """Parametre olarak gelen 'limit' kadar okunmamış haber çeker."""
    read_news_records = db.query(models.UserReadHistory.news_id).filter(
        models.UserReadHistory.user_id == user_id
    ).all()
    read_news_ids = [record[0] for record in read_news_records]

    search_body = {
        "size": limit, # ARTIK DİNAMİK (SKORA GÖRE)
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
        print(f"ES hatası: {e}")
        return []
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
):
    if not (es and kafka_producer and recommender_client):
        raise HTTPException(503, "Servisler hazır değil.")

    # 1. Recommender'dan Skorları Al
    try:
        response = await recommender_client.get(f"/api/recommendations/{user_id}")
        response.raise_for_status()
        # Beklenen Format: [{"category": "spor", "score": 90}, ...]
        ranked_categories = response.json().get("categories", [])
    except Exception as e:
        raise HTTPException(503, f"Recommender hatası: {e}")

    final_feed = []
    
    # 2. Döngü: Skorlara Göre Dinamik Haber Topla
    for item in ranked_categories:
        # Toplam limiti aştıysak dur
        if len(final_feed) >= TOTAL_FEED_LIMIT:
            break

        # --- DÜZELTME BAŞLANGICI ---
        if isinstance(item, str):
            category = item
            score = 20
        else:
            category = item.get("category")
            score = item.get("score", 0)
        # --- DÜZELTME BİTİŞİ ---

        # Hedeflenen sayı
        target_count = int(score / 20) + 1 

        # ES'ten haber çek
        unread_news = get_unread_news_from_es(user_id, category, db, limit=target_count)

        # -----------------------------------------------------------
        # EKSİK OLAN VE GERİ EKLENMESİ GEREKEN KISIM BURASI:
        # -----------------------------------------------------------
        
        # 1. Yeterli haber var mı diye bak (Eski Fetcher Mantığı)
        if len(unread_news) < target_count:
            # Yeterli yoksa, Kafka ile Fetcher'ı tetikle (Fire and Forget)
            print(f"[content-finder] '{category}' için haber eksik ({len(unread_news)}/{target_count}). Fetcher tetikleniyor...")
            asyncio.create_task(send_kafka_request(category,target_count))
        
        # 2. Bulduklarımızı ana listeye ekle (Bu satır yoktu, o yüzden liste hep boştu!)
        final_feed.extend(unread_news)

    # Hiç haber yoksa bekleme mesajı dön
    if not final_feed:
        raise HTTPException(202, "Feed oluşturuluyor. Lütfen birazdan tekrar deneyin.")

    # --- 4. MIXER İLE KARIŞTIRMA (Kafka Request-Reply) ---
    correlation_id = str(uuid.uuid4())
    future = asyncio.get_event_loop().create_future()
    pending_requests[correlation_id] = future

    payload = {"user_id": user_id, "feed": final_feed}

    try:
        # A) Mixer'e gönder
        await kafka_producer.send_and_wait(
            KAFKA_TOPIC_UNMIXED_FEED,
            json.dumps(payload).encode("utf-8"),
            headers=[("correlation_id", correlation_id.encode("utf-8"))]
        )

        # B) Mixer'den cevabı bekle (5 sn timeout)
        result = await asyncio.wait_for(future, timeout=3.0)
        return result.get("feed", [])

    except asyncio.TimeoutError:
        pending_requests.pop(correlation_id, None)
        # Mixer cevap vermezse ham listeyi dön (Fallback)
        print("Mixer cevap vermedi, ham liste dönülüyor.")
        return final_feed
    except Exception as e:
        pending_requests.pop(correlation_id, None)
        raise HTTPException(500, f"Mixer işlem hatası: {e}")
