from http.client import HTTPException

import httpx
import asyncio
import hashlib # Benzersiz ID oluşturmak için
from fastapi import FastAPI
from typing import List, Optional
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk # Toplu kayıt için

from models import ArticleInput, ArticleEnriched, Entity
from config import settings


def get_text_chunks(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """
    Uzun bir metni, kelime bazlı, çakışmalı (overlapping) parçalara böler.
    Çakışma, "Elon" bir parçanın sonunda, "Musk" diğerinin başında kalmasın diye önemlidir.
    """
    if not text:
        return []

    words = text.split() # Metni kelimelere ayır

    # Eğer metin zaten chunk_size'dan kısaysa, parçalamaya gerek yok
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words)) # Kelimeleri tekrar birleştir

        # Son parçaya ulaştıysak döngüden çık
        if end >= len(words):
            break

        # Bir sonraki parçanın başlangıcını ayarla (çakışmayı hesaba katarak)
        start += (chunk_size - overlap)

    return chunks

# --- AI Modelleri ---
SENTIMENT_MODEL_URL = "https://api-inference.huggingface.co/models/savasy/bert-base-turkish-sentiment-cased"
NER_MODEL_URL = "https://api-inference.huggingface.co/models/Babelscape/wikineural-multilingual-ner"
HF_HEADERS = {"Authorization": f"Bearer {settings.hf_api_key}"}

# --- Uygulama Kurulumu ---
app = FastAPI()
# Elasticsearch bağlantısını global olarak tanımla
es = Elasticsearch(hosts=[settings.elasticsearch_url])

# --- Elasticsearch Index Kontrolü (Başlangıçta) ---
@app.on_event("startup")
def startup_event():
    index_name = "news_articles"
    if not es.indices.exists(index=index_name):
        try:
            es.indices.create(index=index_name)
            print(f"'{index_name}' index'i Elasticsearch'te oluşturuldu.")
        except Exception as e:
            print(f"Elasticsearch index oluşturulamadı: {e}")
    print("AI Enrichment Service başlatıldı ve Elasticsearch'e bağlandı.")

# --- Yardımcı Fonksiyon: HF API Çağrısı (DEĞİŞİKLİK YOK) ---
async def query_hf_api(text: str, model_url: str) -> Optional[dict]:
    if not text:
        return None
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(model_url, headers=HF_HEADERS, json={"inputs": text})
            if response.status_code == 200:
                return response.json()
            else:
                print(f"HF API Hatası (Model: {model_url}): {response.status_code} - {response.text}")
                return None
        except httpx.ReadTimeout:
            print(f"HF API Zaman Aşımı (Model: {model_url})")
            return None
        except Exception as e:
            print(f"Bilinmeyen HF API Hatası (Model: {model_url}): {e}")
            return None

# --- YENİ YARDIMCI FONKSİYON: TEK BİR MAKALE İŞLEME (CHUNKING İLE) ---
async def process_single_article(article: ArticleInput) -> ArticleEnriched:
    """
    Bir makaleyi alır, 3000 kelime olsa bile parçalayarak işler (chunking)
    ve 'ArticleEnriched' nesnesini döndürür.
    """

    # 1. Metni Hazırla (Artık Kırpmıyoruz)
    text_to_analyze = article.content if article.content else article.description or ""

    # 2. Metni Parçala
    # 400 kelimelik parçalar, 50 kelime çakışma (overlap) ile
    chunks = get_text_chunks(text_to_analyze, chunk_size=400, overlap=50)

    if not chunks:
        print(f"'{article.title}' için analiz edilecek metin bulunamadı. Atlanıyor.")
        doc_id = hashlib.md5(article.url.encode()).hexdigest()
        return ArticleEnriched(**article.model_dump(), id=doc_id) # AI olmadan kaydet

    print(f"'{article.title}' işleniyor ({len(chunks)} parça)...")

    # 3. TÜM parçalar için TÜM AI görevlerini paralel olarak hazırla
    # Örn: 3000 kelime (8 parça) -> 8 sentiment + 8 NER = 16 görev
    sentiment_tasks = []
    ner_tasks = []
    for chunk in chunks:
        sentiment_tasks.append(query_hf_api(chunk, SENTIMENT_MODEL_URL))
        ner_tasks.append(query_hf_api(chunk, NER_MODEL_URL))

    # 4. Görevleri Çalıştır (İki grup halinde)
    sentiment_results = await asyncio.gather(*sentiment_tasks)
    ner_results = await asyncio.gather(*ner_tasks)

    # 5. Sonuçları Toparla ve Birleştir (Aggregate)
    doc_id = hashlib.md5(article.url.encode()).hexdigest()
    enriched_article = ArticleEnriched(**article.model_dump(), id=doc_id)

    # --- 5a. Sentiment Sonuçlarını Birleştir ---
    sentiment_scores = {"POSITIVE": [], "NEGATIVE": [], "NEUTRAL": []}
    for res in sentiment_results:
        if res and isinstance(res, list) and res[0]:
            best_sentiment = res[0][0]
            label = best_sentiment.get('label').upper()
            score = best_sentiment.get('score')
            if label in sentiment_scores:
                sentiment_scores[label].append(score)

    # Hangi duygu daha baskınsa (veya ortalaması yüksekse) onu seç
    final_sentiment = "NEUTRAL"
    max_avg_score = -1.0
    if not any(sentiment_scores.values()): # Hiçbir sonuç gelmediyse
        final_sentiment = None
        final_score = None
    else:
        for label, scores in sentiment_scores.items():
            if scores: # O etiket için en az bir sonuç varsa
                avg_score = sum(scores) / len(scores)
                if avg_score > max_avg_score:
                    max_avg_score = avg_score
                    final_sentiment = label

        final_score = max_avg_score if max_avg_score > -1.0 else None

    enriched_article.sentiment_label = final_sentiment
    enriched_article.sentiment_score = final_score

    # --- 5b. NER ve Tags Sonuçlarını Birleştir ---
    entities_map = {} # Benzersiz varlıkları (unique) saklamak için dict kullanalım
    tags_set = set()

    for res in ner_results:
        if res and isinstance(res, list):
            for item in res:
                if 'word' in item and 'entity_group' in item:
                    entity_text = item.get('word')
                    entity_type = item.get('entity_group')

                    # Varlığı hem etikete (tags) hem de varlık haritasına (entities) ekle
                    tags_set.add(entity_text)

                    # Eğer bu varlığı zaten bulduysak, üzerine yazma (ilkini koru)
                    if entity_text not in entities_map:
                        entities_map[entity_text] = Entity(text=entity_text, type=entity_type)

    enriched_article.entities = list(entities_map.values())
    enriched_article.tags = list(tags_set)

    print(f"'{article.title}' zenginleştirildi (ID: {doc_id}).")
    return enriched_article


# --- GÜNCELLENMİŞ ANA ENDPOINT: HIZLI VE TOPLU KAYIT ---
@app.post("/enrich-and-save", response_model=dict)
async def enrich_and_save_list(articles: List[ArticleInput]):
    """
    Fetcher'dan gelen listeyi alır.
    TÜM makaleleri ASENKRON (paralel) olarak zenginleştirir.
    TÜM sonuçları TOPLU (bulk) olarak Elasticsearch'e kaydeder.
    """
    print(f"Zenginleştirilmek ve kaydedilmek üzere {len(articles)} adet makale alındı.")

    # 1. TÜM GÖREVLERİ OLUŞTUR (HENÜZ ÇALIŞTIRMA)
    # 360 makale varsa, 360 adet 'process_single_article' görevi oluşturulur.
    tasks = [process_single_article(article) for article in articles]

    # 2. TÜM GÖREVLERİ PARALEL OLARAK ÇALIŞTIR
    # Bu, 360 makalenin hepsinin AI'ye AYNI ANDA gitmesini sağlar.
    # Toplam süre, en yavaş tek bir makalenin işlenme süresi kadar olacaktır (örn: 6-12 saniye)
    # 36 dakika DEĞİL!
    try:
        enriched_results = await asyncio.gather(*tasks)
    except Exception as e:
        print(f"Kritik Hata - asyncio.gather: {e}")
        raise HTTPException(status_code=500, detail="Makale işleme sırasında hata oluştu.")

    # 3. ELASTICSEARCH'E TOPLU (BULK) KAYDETME
    # 360 haberi tek tek kaydetmek yavaştır. Hepsini tek seferde yollayacağız.
    actions = []
    for doc in enriched_results:
        # doc (ArticleEnriched) boş değilse (örn: bir hata olmadıysa)
        if doc:
            actions.append({
                "_index": "news_articles", # Kaydedilecek index
                "_id": doc.id,             # Benzersiz ID'miz
                "_source": doc.model_dump() # Verinin kendisi (JSON'a çevrilmiş)
            })

    if not actions:
        print("Kaydedilecek geçerli makale bulunamadı.")
        return {"message": "Kaydedilecek geçerli makale bulunamadı.", "saved_count": 0, "failed_count": 0}

    try:
        # Toplu kayıt işlemini başlat
        success_count, errors = bulk(es, actions)

        print(f"Elasticsearch Toplu Kayıt Tamamlandı. Başarılı: {success_count}, Hatalı: {len(errors)}")
        if errors:
            print(f"İlk Hata: {errors[0]}")

        return {
            "message": "Toplu zenginleştirme ve kaydetme tamamlandı.",
            "saved_count": success_count,
            "failed_count": len(errors)
        }

    except Exception as e:
        print(f"Elasticsearch Toplu Kayıt (Bulk) Hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Elasticsearch toplu kayıtta hata: {e}")