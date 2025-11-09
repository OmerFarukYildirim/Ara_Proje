package cache

import (
	"context"
	"log"
	"recommender/config"

	"github.com/redis/go-redis/v9"
)

// RDB, tüm paketlerin erişebileceği global Redis istemcisidir.
var RDB *redis.Client

// Init, Redis bağlantısını başlatır.
func Init() {
	redisAddr := config.Get("REDIS_ADDR")
	redisPass := config.Get("REDIS_PASSWORD")
	if redisAddr == "" {
		log.Fatal("REDIS_ADDR .env dosyasında ayarlanmamış.")
	}

	RDB = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPass,
		DB:       0, // Varsayılan 0 nolu veritabanı
	})

	// Bağlantıyı test et
	if _, err := RDB.Ping(context.Background()).Result(); err != nil {
		log.Fatalf("Redis'e bağlanılamadı: %v", err)
	}

	log.Println("Redis'e başarıyla bağlandı.")
}
