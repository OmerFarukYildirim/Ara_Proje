import asyncio
import json
import hashlib
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from elasticsearch import Elasticsearch
from aiokafka import AIOKafkaConsumer
import httpx

from config import settings
from models import ArticleInput, ArticleEnriched, Entity

# --- AI Modelleri ---
SENTIMENT_MODEL_URL = "https://router.huggingface.co/hf-inference/models/savasy/bert-base-turkish-sentiment-cased"
NER_MODEL_URL = "https://router.huggingface.co/hf-inference/models/Babelscape/wikineural-multilingual-ner"
HF_HEADERS = {"Authorization": f"Bearer {settings.hf_api_key}"}

# --- Global Değişkenler ---
es: Optional[Elasticsearch] = None
consumer: Optional[AIOKafkaConsumer] = None

# --- Yardımcı Fonksiyonlar ---
def get_text_chunks(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    if not text: return []
    words = text.split()
    if len(words) <= chunk_size: return [text]
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        if end >= len(words): break
        start += (chunk_size - overlap)
    return chunks

async def query_hf_api(text: str, model_url: str) -> Optional[dict]:
    if not text: return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(model_url, headers=HF_HEADERS, json={"inputs": text})
            if response.status_code == 200: return response.json()
            print(f"HF API Hatası ({model_url}): {response.status_code}")
            return None
        except Exception as e:
            print(f"HF API Bağlantı Hatası: {e}")
            return None

# --- ANA İŞ MANTIĞI: Tek Bir Haberi İşle ve Kaydet ---
async def process_and_save_article(article_data: dict):
    try:
        # 1. Gelen JSON'u Pydantic modeline çevir
        # (C#'tan gelen veride 'summary' alanı dolu olacak)
        article_in = ArticleInput(**article_data)
        print(f"Haber alındı: {article_in.title[:30]}...")

        # 2. ID oluştur (URL'den)
        doc_id = hashlib.md5(article_in.url.encode()).hexdigest()

        # 3. 🚨 ES Kontrolü: Aynı ID'ye sahip döküman zaten var mı?
        # Bu, üzerine yazmayı (overwrite) engeller
        if es.exists(index="news_articles", id=doc_id):
            print(f"⚠️ Haber zaten mevcut. Kayıt atlandı. (ID: {doc_id})")
            return

        # 3. Zenginleştirme için metni hazırla
        # (Processor'dan gelen 'summary' varsa onu, yoksa 'content'i kullanabiliriz.
        #  NER/Sentiment için tam metin 'content' daha iyidir.)
        text_to_analyze = article_in.content or ""

        # 4. Metni parçala ve AI'ya sor (Paralel)
        chunks = get_text_chunks(text_to_analyze)
        sentiment_tasks = [query_hf_api(chunk, SENTIMENT_MODEL_URL) for chunk in chunks]
        ner_tasks = [query_hf_api(chunk, NER_MODEL_URL) for chunk in chunks]

        results = await asyncio.gather(*sentiment_tasks, *ner_tasks)
        sentiment_results = results[:len(chunks)]
        ner_results = results[len(chunks):]

        # 5. Sonuçları Birleştir
        enriched_article = ArticleEnriched(**article_in.model_dump(), id=doc_id)

        # (Basitleştirilmiş Sentiment Birleştirme)
        sentiments = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
        for res in sentiment_results:
            if res and isinstance(res, list) and res[0]:
                sentiments[res[0][0]['label'].upper()] += 1
        enriched_article.sentiment_label = max(sentiments, key=sentiments.get)

        # (Basitleştirilmiş NER Birleştirme)
        entities_map = {}
        tags_set = set()
        for res in ner_results:
            if res and isinstance(res, list):
                for item in res:
                    if 'word' in item and 'entity_group' in item:
                        tags_set.add(item['word'])
                        if item['word'] not in entities_map:
                            entities_map[item['word']] = Entity(text=item['word'], type=item['entity_group'])
        enriched_article.entities = list(entities_map.values())
        enriched_article.tags = list(tags_set)

        # 6. Elasticsearch'e Kaydet
        es.index(index="news_articles", id=doc_id, document=enriched_article.model_dump())
        print(f"✅ Haber başarıyla ES'e kaydedildi (ID: {doc_id})")

    except Exception as e:
        print(f"❌ Haber işleme hatası: {e}")

# --- KAFKA TÜKETİCİ DÖNGÜSÜ ---
async def consume():
    global consumer
    consumer = AIOKafkaConsumer(
        settings.kafka_topic_consume,
        bootstrap_servers=settings.kafka_brokers,
        group_id=settings.kafka_consumer_group,
        auto_offset_reset="earliest"
    )
    await consumer.start()
    print("Kafka Consumer başlatıldı, mesajlar bekleniyor...")
    try:
        async for msg in consumer:
            # Gelen her mesajı arka planda işle (bloklamadan)
            asyncio.create_task(process_and_save_article(json.loads(msg.value)))
    finally:
        await consumer.stop()

# --- UYGULAMA BAŞLATICI (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Başlarken
    global es
    es = Elasticsearch(settings.elasticsearch_url)
    print("Elasticsearch bağlantısı kuruldu.")
    # Kafka tüketicisini arka planda başlat
    asyncio.create_task(consume())
    yield
    # Kapanırken
    if es: es.close()

app = FastAPI(lifespan=lifespan)