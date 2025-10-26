from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ai_enrichment_url: str

    class Config:
        env_file = ".env"

settings = Settings()