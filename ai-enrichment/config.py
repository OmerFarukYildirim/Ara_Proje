from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # .env dosyasındaki değişken adlarıyla aynı olmalı
    hf_api_key: str
    elasticsearch_url: str

    class Config:
        env_file = ".env" # .env dosyasını oku

# settings adında bir nesne oluşturuyoruz
# Artık projenin her yerinden "settings.hf_api_key" diyerek bu bilgiye erişebileceğiz.
settings = Settings()