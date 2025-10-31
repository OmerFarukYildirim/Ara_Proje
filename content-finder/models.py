from sqlalchemy import create_engine, Column, String, DateTime, func, PrimaryKeyConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

Base = declarative_base()

# --- "Okundu" Bilgisini Tutacağımız Tablo ---
class UserReadHistory(Base):
    __tablename__ = 'user_read_history'

    user_id = Column(String(255), nullable=False, index=True)
    news_id = Column(String(32), nullable=False) # Elasticsearch'teki MD5 ID'si (32 karakter)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

    # Bir kullanıcının bir haberi sadece bir kez okuyabilmesi için
    # 'user_id' ve 'news_id'yi birlikte birincil anahtar (Primary Key) yap
    __table_args__ = (
        PrimaryKeyConstraint('user_id', 'news_id'),
    )

# --- Veritabanı Bağlantı Kurulumu ---
try:
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine) # Tabloyu (eğer yoksa) otomatik oluşturur
    print("[content-finder] PostgreSQL'e başarıyla bağlandı ve tablo oluşturuldu.")
except Exception as e:
    print(f"[content-finder] PostgreSQL bağlantı hatası: {e}")