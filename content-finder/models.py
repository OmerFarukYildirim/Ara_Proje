from pydantic import BaseModel
from typing import List, Optional

# --- Fetcher'dan Bize Gelecek Olan Model ---
# ai-enrichment projesindeki ArticleInput ile aynı
class ArticleInput(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None # Bu, NewsAPI'den gelen kısa metin olacak
    url: str