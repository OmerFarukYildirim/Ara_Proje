#!/bin/bash



echo "--------------------------------------------------------"

echo "--- 1/10: Veritabanlarını (Postgres) Başlat ---"

echo "--------------------------------------------------------"

docker compose up -d --no-build postgres_auth postgres_recommender postgres_userreads



echo "Postgresql veritabanlarının ayağa kalkması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 2/10: Veritabanlarını (ElasticSearch) Başlat ---"

echo "--------------------------------------------------------"

docker compose up -d --no-build elasticsearch



echo "ElasticSearch veritabanının ayağa kalkması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 3/10: Veritabanlarını (Redis) Başlat ---"

echo "--------------------------------------------------------"

docker compose up -d --no-build redis_cache



echo "Redis veritabanının ayağa kalkması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 4/10: Zookeeper ve Arayüzü Başlat ---"

echo "--------------------------------------------------------"

# Bu aşamada Kafka servisini başlat

docker compose up -d --no-build zookeeper kafka-ui



echo "Kafka'nın topic'leri oluşturması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 5/10: Kafka---"

echo "--------------------------------------------------------"



docker compose up -d --no-build kafka



echo "Kafka'nın topic'leri oluşturması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 6/10: Auth Servisini Başlat ---"

echo "--------------------------------------------------------"



docker compose up -d --build auth-service 



echo "Auth servisin ilk bağlantısını kurması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 7/10: Recommender Servisini Başlat ---"

echo "--------------------------------------------------------"



docker compose up -d --build recommender-service



echo "Recommender servisin ilk bağlantısını kurması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 8/10: Fetcher Servisini Başlat ---"

echo "--------------------------------------------------------"



docker compose up -d --build fetcher-service



echo "Fetcher servisin ilk bağlantısını kurması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "--- 9/10: Otomasyon Servislerini Başlat ---"

echo "--------------------------------------------------------"



docker compose up -d --build content-finder-service processor-service ai-enrichment-service


echo "Otomasyon servislerinin ilk bağlantısını kurması için 15 saniye bekleniyor..."

sleep 15



echo "--------------------------------------------------------"

echo "✅ TÜM SERVİSLER BAŞLATILDI. 10/10"

echo "Durumu kontrol etmek için: docker compose ps"

echo "--------------------------------------------------------"
