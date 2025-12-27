from fastapi import FastAPI, Depends, HTTPException, Security
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from elasticsearch import Elasticsearch
import models
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import settings
from typing import List, Dict, Any, Optional
import json
import httpx
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import uuid
import asyncio
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

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
NEWSDATA_API_KEY = "pub_01dca7322fcf46e583aa9fa5498abb97"

scheduler = AsyncIOScheduler()

# Otomatik taranacak kategoriler listesi
AUTO_SCAN_CATEGORIES = [
    "technology", "sports", "science", "travel", "health",
    "business", "entertainment", "game", "politics"
]

es: Optional[Elasticsearch] = None
# YENİ: Recommender (Go) servisi için HTTP Client
recommender_client: Optional[httpx.AsyncClient] = None

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Bearer şeması
security = HTTPBearer()

# --- JWT AYARLARI (Kendi Auth servis ayarlarınla değiştir) ---
JWT_SECRET_KEY = "ara123456789proje123456789ara123456789proje123456789"
JWT_ALGORITHM = "HS256"
AUTH_SERVICE_INFO_URL = "http://auth-service:8090/api/users/account"
# --- main.py ---

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Frontend'den gelen Token'ı alır, Auth servisine gönderir.
    Auth servisinden dönen UserDTO içindeki gerçek 'id'yi döndürür.
    """
    token = credentials.credentials

    async with httpx.AsyncClient() as client:
        try:
            # Token'ı aynen Auth servisine iletiyoruz (Proxy gibi)
            response = await client.get(
                AUTH_SERVICE_INFO_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )

            if response.status_code == 200:
                # Senin Java Response yapın:
                # { "statusCode": 200, "message": "success", "data": { "id": 2, "email": "..." } }
                response_json = response.json()

                # 'data' alanının içindeki 'id'yi alıyoruz
                user_data = response_json.get("data", {})
                real_user_id = user_data.get("id")

                print(f"✅ [DEBUG] Auth Servisi Onayladı. Email: {user_data.get('email')} -> ID: {real_user_id}")

                if not real_user_id:
                    raise HTTPException(status_code=401, detail="Auth servisinden ID dönmedi.")

                return str(real_user_id) # Veritabanına string olarak soracağımız için

            else:
                print(f"⛔ [HATA] Auth Servisi Hata Döndü: {response.status_code}")
                raise HTTPException(status_code=401, detail="Oturum geçersiz.")

        except httpx.RequestError as e:
            print(f"❌ [HATA] Auth Servisine Bağlanılamadı: {e}")
            raise HTTPException(status_code=503, detail="Kimlik doğrulama servisine ulaşılamıyor.")
def safe_decode(value):
    """Değer byte ise decode eder, değilse olduğu gibi bırakır."""
    if isinstance(value, bytes):
        return value.decode('utf-8')
    return value

# --- YENİ FONKSİYON: Arka Plan Görevi ---
async def scheduled_news_job():
    print(">>> [SCHEDULER] Saatlik otomatik tarama başladı...")
    if not kafka_producer:
        print(">>> [SCHEDULER HATA] Kafka Producer hazır değil!")
        return

    # Her kategori için 2 haber iste
    for category in AUTO_SCAN_CATEGORIES:
        # fetch_urls_and_push_kafka fonksiyonunu zaten yazmıştık, onu çağırıyoruz.
        # Bu fonksiyon gidip URL'leri bulacak ve Kafka'ya "Scrape et" diye basacak.
        await fetch_urls_and_push_kafka(category, 2)

        # API rate limit yememek için araya minik bir bekleme koyabilirsin (opsiyonel)
        await asyncio.sleep(2)

    print(">>> [SCHEDULER] Saatlik tarama isteği tamamlandı.")

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

    # 1. ElasticSearch Bağlantısı
    try:
        es = Elasticsearch(settings.elasticsearch_url)
        if es.ping():
            print("[content-finder] ElasticSearch Bağlantısı Başarılı.", flush=True)
        else:
            print("[content-finder] ElasticSearch Ping Başarısız!", flush=True)
    except Exception as e:
        print(f"[content-finder] ES Hatası: {e}", flush=True)
        es = None

    # 2. Kafka Producer Başlat (RETRY MEKANİZMASI İLE)
    # Kafka hemen hazır olmayabilir, 5 kez deneyeceğiz.
    producer_connected = False
    for i in range(5):
        try:
            print(f"[content-finder] Kafka Producer bağlanıyor... (Deneme {i+1}/5)", flush=True)
            kafka_producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_brokers)
            await kafka_producer.start()
            producer_connected = True
            print("[content-finder] ✅ Kafka Producer BAŞARIYLA BAŞLATILDI.", flush=True)

            # --- HEMEN TETİKLEME ---
            print("[content-finder] 🔥 BAŞLANGIÇ TARAMASI TETİKLENİYOR... (Hemen şimdi)", flush=True)
            asyncio.create_task(scheduled_news_job())
            break # Bağlandıysak döngüden çık
        except Exception as e:
            print(f"[content-finder] ❌ Kafka Producer hatası: {e}", flush=True)
            kafka_producer = None
            await asyncio.sleep(5) # 5 saniye bekle tekrar dene

    if not producer_connected:
        print("[content-finder] ⛔ KRİTİK: Kafka Producer başlatılamadı! Haber taraması yapılamayacak.", flush=True)

    # 3. Scheduler'ı Başlat
    try:
        # CronTrigger: Her saatin 0. dakikasında (Tam saatlerde)
        scheduler.add_job(scheduled_news_job, CronTrigger(minute='0'))
        scheduler.start()
        print("[content-finder] ⏰ Otomatik Haber Scheduler Başlatıldı (Cron: minute='0').", flush=True)
    except Exception as e:
        print(f"[content-finder] Scheduler Hatası: {e}", flush=True)

    # 4. Recommender Client
    try:
        recommender_client = httpx.AsyncClient(
            base_url=settings.recommender_service_url,
            headers={"X-API-Key": settings.trusted_api_key},
            timeout=10.0
        )
    except:
        recommender_client = None

    # 5. Kafka Consumer Başlat (Consumer için de Retry iyi olur ama şimdilik basit tutalım)
    try:
        kafka_consumer = AIOKafkaConsumer(
            KAFKA_TOPIC_MIXED_REPLY,
            bootstrap_servers=settings.kafka_brokers,
            group_id="content-finder-reply-group",
            auto_offset_reset="earliest"
        )
        await kafka_consumer.start()

        # Bloklamayan dinleme görevi
        asyncio.create_task(wait_for_assignment_and_consume())

    except Exception as e:
        print(f"[content-finder] Kafka Consumer hatası: {e}", flush=True)
        kafka_consumer = None

# Consumer Assignment ve Dinlemeyi ayıran yardımcı fonksiyon
# (startup_event'i temiz tutmak ve bloklamayı önlemek için)
async def wait_for_assignment_and_consume():
    if not kafka_consumer: return

    print("[content-finder] Consumer assignment bekleniyor...")
    # Assignment gelene kadar bekle (Ama artık create_task içinde olduğu için ana akışı durdurmaz)
    while kafka_consumer.assignment() == set():
        await asyncio.sleep(1.0)

    print("[content-finder] Mixer Consumer Hazır! Dinleme başlıyor.")
    await consume_replies()
@app.on_event("shutdown")
async def shutdown_event():
    if kafka_producer: await kafka_producer.stop()
    if kafka_consumer: await kafka_consumer.stop() # YENİ
    if es: es.close()
    if recommender_client: await recommender_client.aclose()
    scheduler.shutdown()
def get_db():
    """PostgreSQL oturum (session) bağımlılığı"""
    db = models.SessionLocal()
    try:
        yield db
    finally:
        db.close()



# --- YARDIMCI FONKSİYONLAR ---

# --- YENİ YARDIMCI FONKSİYON: Kategori Eşleştirme ---
def map_category_to_newsdata(local_category: str) -> str:
    """
    Sistemimizdeki kategori isimlerini (Türkçe veya İngilizce gelebilir)
    NewsData.io API'sinin kabul ettiği standart İngilizce parametrelere çevirir.
    """
    # Gelen string'i küçült ve boşlukları temizle (Hata önlemek için)
    cat = local_category.lower().strip()

    mapping = {
        # --- İŞ / EKONOMİ ---
        "ekonomi": "business",
        "is_dunyasi": "business",
        "business": "business",

        # --- SUÇ / ASAYİŞ ---
        "suc": "crime",
        "asayis": "crime",
        "crime": "crime",

        # --- EĞİTİM ---
        "egitim": "education",
        "education": "education",

        # --- EĞLENCE / MAGAZİN ---
        "eglence": "entertainment",
        "magazin": "entertainment",
        "entertainment": "entertainment",

        # --- ÇEVRE ---
        "cevre": "environment",
        "doga": "environment",
        "environment": "environment",

        # --- YEMEK / GASTRONOMİ ---
        "yemek": "food",
        "gastronomi": "food",
        "mutfak": "food",
        "food": "food",

        # --- SAĞLIK ---
        "saglik": "health",
        "health": "health",

        # --- YAŞAM TARZI ---
        "yasam": "lifestyle",
        "yasam_tarzi": "lifestyle",
        "lifestyle": "lifestyle",

        # --- SİYASET ---
        "siyaset": "politics",
        "politika": "politics",
        "politics": "politics",

        # --- BİLİM ---
        "bilim": "science",
        "science": "science",

        # --- SPOR ---
        "spor": "sports",
        "sports": "sports",

        # --- TEKNOLOJİ ---
        "teknoloji": "technology",
        "technology": "technology",

        # --- TURİZM / SEYAHAT ---
        "turizm": "tourism",
        "seyahat": "tourism",
        "tourism": "tourism",

    }

    # Eşleşme yoksa 'other' dönsün, ya da 'top' (manşet) dönebilirsin.
    return mapping.get(cat, "other")

# --- DEĞİŞTİRİLECEK FONKSİYON: send_kafka_request YERİNE GELECEK ---
# Eski send_kafka_request fonksiyonunu silip veya yorum satırına alıp bunu ekle:

async def fetch_urls_and_push_kafka(category: str, required_count: int):
    """
    1. NewsData.io'dan gerçek haber linklerini çeker.
    2. Her bir linki işlenmesi için Kafka'ya atar.
    """
    if not kafka_producer:
        print(f"Hata: Kafka producer yok.")
        return

    mapped_category = map_category_to_newsdata(category)
    print(f"[content-finder] NewsData.io'dan '{category}' ({mapped_category}) için {required_count} haber linki isteniyor...")

    # NewsData.io API İsteği
    url = "https://newsdata.io/api/1/latest"
    params = {
        "apikey": NEWSDATA_API_KEY,
        "q": mapped_category, # query parametresi olarak kategoriyi de geçebiliriz veya category parametresiyle
        "category": mapped_category,
        "language": "tr,en", # Türkçe ve İngilizce haberler
        "prioritydomain": "top" # Güvenilir kaynaklar
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params)
            data = resp.json()

            if data.get("status") != "success":
                print(f"[content-finder] NewsData API Hatası: {data}")
                return

            results = data.get("results", [])

            # Bulunan haberlerden, required_count kadarını alıp Kafka'ya atıcaz
            sent_count = 0
            for news_item in results:
                if sent_count >= required_count:
                    break

                article_url = news_item.get("link")
                image_url = news_item.get("image_url")

                # Eğer resim yoksa veya link yoksa atla (Kalite kontrol)
                if not article_url:
                    continue

                # Image URL bazen null gelebilir, placeholder koyabiliriz veya boş bırakabiliriz
                if not image_url:
                    image_url = "https://via.placeholder.com/600x400?text=No+Image"

                # KAFKA MESAJ FORMATI (Fetcher'ın bekleyeceği yeni format)
                kafka_payload = {
                    "url": article_url,
                    "image_url": image_url,
                    "target_category": category # Bizim sistemdeki kategori adı (örn: teknoloji)
                }

                message_bytes = json.dumps(kafka_payload).encode("utf-8")

                await kafka_producer.send_and_wait(
                    settings.kafka_topic_news_request,
                    message_bytes
                )
                sent_count += 1

            print(f"[content-finder] Kafka'ya {sent_count} adet URL işleme görevi yollandı.")

        except Exception as e:
            print(f"[content-finder] NewsData.io isteği başarısız: {e}")

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
        missing_count = target_count - len(unread_news)
        if missing_count > 0:
            print(f"[content-finder] '{category}' için {missing_count} haber eksik. NewsData.io tetikleniyor...")
            # Arka planda çalıştır (await dersen kullanıcı bekler, create_task ile fire-and-forget)
            asyncio.create_task(fetch_urls_and_push_kafka(category, missing_count))
        
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


# --- main.py İÇİNE EKLE ---

@app.get("/api/user/read-history", response_model=List[str])
def get_user_read_history(
        user_id: str = Depends(get_current_user_id), # Token'dan user_id gelir
        db: Session = Depends(get_db)
):
    """
    Kullanıcının daha önce okuduğu haberlerin ID listesini döner.
    Girdi: Header'da Bearer Token
    Çıktı: ["news_123", "news_456", ...]
    """
    try:
        # SQLAlchemy ile sorgu: Sadece news_id kolonunu çekiyoruz
        history_records = db.query(models.UserReadHistory.news_id) \
            .filter(models.UserReadHistory.user_id == user_id) \
            .all()

        # Tuple listesini düz listeye çevir: [('id1',), ('id2',)] -> ['id1', 'id2']
        news_ids = [record[0] for record in history_records]
        return news_ids

    except Exception as e:
        print(f"History Fetch Hatası: {e}")
        raise HTTPException(status_code=500, detail="Okuma geçmişi alınamadı.")

    # --- main.py İÇİNE EKLE/GÜNCELLE ---

@app.get("/api/news/detail/{news_id}")
def get_single_news_detail(
        news_id: str,
        # Güvenlik için: user_id: str = Depends(get_current_user_id)
):
    """
    Verilen TEK BİR haber ID'sine göre ElasticSearch'ten detayları döner.
    """
    if not es:
        raise HTTPException(status_code=503, detail="ElasticSearch bağlantısı yok.")

    try:
        # ElasticSearch'te spesifik bir ID'yi aramak için 'ids' query en hızlısıdır.
        search_body = {
            "size": 1,
            "query": {
                "ids": {
                    "values": [news_id]
                }
            }
        }

        response = es.search(index="news_articles", body=search_body)
        hits = response.get("hits", {}).get("hits", [])

        if not hits:
            # Haber bulunamazsa 404 dönmek en doğrusu
            raise HTTPException(status_code=404, detail="Haber bulunamadı.")

        # Liste ([...]) değil, doğrudan objenin kendisini ({...}) dönüyoruz
        return hits[0]["_source"]

    except HTTPException as he:
        raise he # Kendi fırlattığımız 404'ü yukarı ilet
    except Exception as e:
        print(f"ES Single Fetch Hatası: {e}")
        raise HTTPException(status_code=500, detail="Haber detayı alınamadı.")