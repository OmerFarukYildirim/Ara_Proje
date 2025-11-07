from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    hf_api_key: str
    elasticsearch_url: str

    # --- YENİ ---
    kafka_brokers: str
    kafka_topic_consume: str
    kafka_consumer_group: str

    class Config:
        env_file = ".env"

settings = Settings()