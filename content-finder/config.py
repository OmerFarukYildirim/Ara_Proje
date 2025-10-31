from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    elasticsearch_url: str
    fetcher_service_url: str
    class Config:
        env_file = ".env"

settings = Settings()