

import httpx
import asyncio
from fastapi import FastAPI
from typing import List, Optional
from bs4 import BeautifulSoup

from models import ArticleInput
from config import settings

app = FastAPI()

# AI Servisine istek atmak için global bir Asenkron Client oluşturalım
# Bu, "connection pool" kullanarak performansı artırır
ai_client = httpx.AsyncClient(
    base_url=settings.ai_enrichment_url, # http://127.0.0.1:8000
    timeout=300.0 # AI işlemleri uzun sürebilir, timeout'u yüksek tutalım
)

# --- Kazıma (Scraping) Fonksiyonu (Değişiklik yok) ---
async def scrape_full_content(url: str) -> Optional[str]:
    if not url: return None
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                print(f"[CF] Scrape Hatası (URL: {url}): Status {response.status_code}")
                return None
            soup = BeautifulSoup(response.text, 'lxml')
            paragraphs = soup.find_all('p')
            if not paragraphs: return None
            full_text = "\n".join([p.get_text() for p in paragraphs])
            print(f"[CF] Scrape Başarılı (URL: {url}): {len(full_text)} karakter.")
            return full_text
        except Exception as e:
            print(f"[CF] Scrape Kritik Hata (URL: {url}): {e}")
            return None

# --- YENİ YARDIMCI FONKSİYON: Tek makaleyi kazı ve content'i güncelle ---
async def process_article_content(article: ArticleInput) -> ArticleInput:
    """
    Bir makaleyi alır, URL'sini kazır (scrape)
    ve 'content' alanını güncellenmiş olarak döndürür.
    """
    full_text = await scrape_full_content(article.url)

    if full_text:
        # Kazıma başarılıysa, content'i tam metinle değiştir
        article.content = full_text
    else:
        # Kazıma başarısızsa, NewsAPI'nin verdiği kısa content ile devam et
        # (Bu zaten article.content içinde mevcut)
        print(f"[CF] Kazıma başarısız (URL: {article.url}). Kısa content kullanılıyor.")

    return article # Content'i güncellenmiş makaleyi döndür


# --- YENİ ANA ENDPOINT: Fetcher'dan gelen listeyi işleyen ana beyin ---
@app.post("/scrape-and-forward", response_model=dict)
async def handle_scrape_and_forward(articles: List[ArticleInput]):
    """
    Fetcher'dan gelen makale listesini alır.
    1. Tüm makalelerin URL'lerini paralel olarak kazır (scrape).
    2. 'content' alanlarını günceller.
    3. Güncellenmiş listeyi AI-Enrichment servisine (:8000) yollar.
    4. AI servisinden gelen cevabı Fetcher'a geri döndürür.
    """
    print(f"[CF] {len(articles)} adet makale Fetcher'dan alındı. Kazıma başlıyor...")

    # --- 1. & 2. TÜM KAZIMA (SCRAPING) İŞLEMLERİNİ PARALEL BAŞLAT ---
    # 20 haber varsa, 20'si de aynı anda kazınmaya başlar.
    scraping_tasks = [process_article_content(article) for article in articles]

    try:
        # Güncellenmiş (tam content'li) makale listesini al
        updated_articles = await asyncio.gather(*scraping_tasks)
    except Exception as e:
        print(f"[CF] asyncio.gather (scraping) hatası: {e}")
        raise HTTPException(status_code=500, detail="Makale kazıma sırasında hata oluştu.")

    print(f"[CF] {len(updated_articles)} makale kazındı. AI servisine yönlendiriliyor...")

    # --- 3. GÜNCELLENMİŞ LİSTEYİ AI SERVİSİNE YOLLA ---
    try:
        # AI servisinin (:8000) /enrich-and-save endpoint'ine POST et
        response = await ai_client.post(
            "/enrich-and-save",
            json=[article.model_dump() for article in updated_articles] # Pydantic'i JSON'a çevir
        )
        response.raise_for_status() # 4xx veya 5xx hata varsa exception fırlat

        # AI servisinden gelen cevabı al (örn: {"saved_count": 20, ...})
        ai_response_data = response.json()
        print(f"[CF] AI servisi başarıyla yanıtladı: {ai_response_data}")

        # --- 4. CEVABI FETCHER'A DÖNDÜR ---
        return ai_response_data

    except httpx.HTTPStatusError as e:
        print(f"[CF] AI Servisine istekte HATA (HTTP): {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=502, detail=f"AI servisi hata döndü: {e.response.text}")
    except Exception as e:
        print(f"[CF] AI Servisine istekte HATA (Genel): {e}")
        raise HTTPException(status_code=502, detail=f"AI servisine bağlanılamadı: {e}")