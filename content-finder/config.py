from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    elasticsearch_url: str

    # Kafka
    kafka_brokers: str
    kafka_topic_news_request: str

    # Recommender
    recommender_service_url: str # YENİ
    trusted_api_key: str         # YENİ

    newsdata_api_key: str
    class Config:
        env_file = ".env"

settings = Settings()