from pydantic import BaseModel
from typing import List, Optional

# --- 1. Fetcher'dan Bize Gelecek Olan Model ---
# Bu model, fetcher-service'in bize yollayacağı JSON'a uymalı
class ArticleInput(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None # Zenginleştirme için ana metnimiz bu olacak
    url: str # Haberin benzersiz ID'si olarak bunu kullanacağız
    image_url: Optional[str] = None
    category: Optional[str] = None

# --- 2. Zenginleştirme Sonucu Oluşacak Alt Modeller ---
# Varlık Tanıma (NER) için bir iç model
class Entity(BaseModel):
    text: str # Tanınan varlık (örn: "Elon Musk")
    type: str # Varlığın tipi (örn: "PERSON")


# --- 3. Elasticsearch'e Kaydedeceğimiz Nihai Model ---
# Bu, ArticleInput'un tüm alanlarını + AI tarafından eklenen alanları içerecek
class ArticleEnriched(BaseModel):
    id: str # Bizim tarafımızdan (URL'den) oluşturulacak benzersiz ID
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    category: Optional[str] = None

    # AI ile eklenecek yeni alanlar
    sentiment_label: Optional[str] = None  # örn: "POSITIVE", "NEGATIVE"
    sentiment_score: Optional[float] = None # örn: 0.98
    tags: Optional[List[str]] = []         # örn: ["Yapay Zeka", "Tesla"]
    entities: Optional[List[Entity]] = []    # örn: [{"text": "Elon Musk", "type": "PERSON"}]