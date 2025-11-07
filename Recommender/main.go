/*package main

import (
	"log"
	"recommender/cache"
	"recommender/config"
	"recommender/database"
	"recommender/handler"
	"recommender/middleware" // Auth
	"recommender/repository"
	"recommender/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Ayarları Yükle
	config.LoadConfig()

	// 2. Veritabanlarını Başlat
	database.Init() // PostgreSQL'i başlatır
	cache.Init()    // <-- YENİ: Redis'i başlatır

	// 3. Katmanları Birbirine Bağla (Dependency Injection)

	// 3a. Repository katmanını oluştur (YENİ: Artık 2 bağlantı alıyor)
	scoreRepo := repository.NewScoreRepository(database.DB, cache.RDB)

	// 3b. Service katmanını oluştur (Aynı)
	scoreService := service.NewScoreService(scoreRepo)

	// 3c. Handler katmanını oluştur (Aynı)
	scoreHandler := handler.NewScoreHandler(scoreService)

	// 3d. Auth Middleware'i oluştur (Aynı)
	authMiddleware := middleware.NewAuthMiddleware()

	// 4. Gin (Web Sunucusu) router'ını başlat (Aynı)
	r := gin.Default()

	// 5. API Endpoint'lerini Tanımla (Aynı)
	api := r.Group("/api")
	{
		api.POST("/onboarding", authMiddleware.ValidateToken, scoreHandler.HandleOnboarding)
		api.POST("/interaction", authMiddleware.ValidateToken, scoreHandler.HandleInteraction)
	}

	// Ping testi (Ping'e Redis'i de ekleyelim)
	r.GET("/ping", func(c *gin.Context) {
		// Postgres testi
		dbStatus := "connected"
		if err := database.DB.Ping(c.Request.Context()); err != nil {
			dbStatus = "disconnected"
		}
		// Redis testi
		redisStatus := "connected"
		if _, err := cache.RDB.Ping(c.Request.Context()).Result(); err != nil {
			redisStatus = "disconnected"
		}

		c.JSON(200, gin.H{
			"message":      "pong",
			"service":      "Recommender Service (Go)",
			"db_status":    dbStatus,
			"cache_status": redisStatus, // <-- YENİ
		})
	})

	// 6. Servisi çalıştır (Aynı)
	port := config.Get("PORT")
	if port == "" {
		port = "8004"
	}

	log.Printf("Recommender servisi http://localhost:%s adresinde başlatılıyor...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}*/

package main

import (
	"context"
	"log"
	"net/http" // Ping endpoint'i için
	"os"
	"os/signal" // Graceful shutdown için
	"syscall"   // Graceful shutdown için

	"github.com/gin-gonic/gin"

	"recommender/cache"
	"recommender/config"
	"recommender/database"
	"recommender/handler"
	"recommender/kafka" // YENİ
	"recommender/middleware"
	"recommender/repository"
	"recommender/service"
)

func main() {
	// 1. Ayarları Yükle
	config.LoadConfig()

	// 2. Veritabanlarını (Postgres, Redis) Başlat
	database.Init()
	cache.Init()

	// 3. Kafka Producer'ı Başlat (API'nin kullanması için)
	kafkaProducer := kafka.InitProducer()

	// 4. Katmanları Birbirine Bağla (Dependency Injection)
	scoreRepo := repository.NewScoreRepository(database.DB, cache.RDB)
	scoreService := service.NewScoreService(scoreRepo)

	// Handler artık hem Producer'ı hem Service'i alıyor (profesyonelce)
	scoreHandler := handler.NewScoreHandler(kafkaProducer, scoreService)
	authMiddleware := middleware.NewAuthMiddleware()

	// 5. Kafka Consumer'ı Başlat (Arka plan işçisi)
	// Consumer'ın 'service'e ihtiyacı var
	kafkaConsumer := kafka.NewConsumer(scoreService)

	// 6. Graceful Shutdown (Düzgün Kapanma) için Context hazırla
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // main() bittiğinde her şeyi iptal et

	// 7. Consumer'ı (İşçi) arka planda (go routine) başlat
	go func() {
		// kafkaConsumer.Start(ctx), 'kafka/kafka.go' içindeki o
		// 'ReadMessage' döngüsünü zaten kendi başına çalıştırır.
		kafkaConsumer.Start(ctx)
	}()

	// --- GÜNCELLENMİŞ GOROUTINE BAŞLATMA (Daha Temiz) ---
	go func() {
		kafkaConsumer.Start(ctx) // Bu fonksiyon sonsuz döngüdedir
	}()
	// --- BİTTİ ---

	// 8. API Sunucusunu (Gin) Ayarla
	r := setupRouter(scoreHandler, authMiddleware)

	// 9. API Sunucusunu (Gin) başka bir 'go routine' içinde başlat
	srv := &http.Server{
		Addr:    ":" + config.Get("PORT"),
		Handler: r,
	}

	go func() {
		log.Printf("Recommender servisi (API ve Kafka Tüketici) http://localhost:%s adresinde başlatılıyor...", config.Get("PORT"))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Gin sunucusu başlatılamadı: %v", err)
		}
	}()

	// 10. Kapanma Sinyalini (Ctrl+C) Bekle
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit // Sinyal gelene kadar burada bekle

	log.Println("Servis kapatılıyor (Graceful Shutdown)...")

	// Kafka Consumer'a "dur" sinyali yolla
	cancel()

	// Kafka bağlantılarını kapat
	kafkaProducer.Close()
	kafkaConsumer.Close()

	// (Opsiyonel) Gin sunucusuna da düzgün kapanması için süre ver
	// ctxShutDown, _ := context.WithTimeout(context.Background(), 5*time.Second)
	// if err := srv.Shutdown(ctxShutDown); err != nil {
	// 	log.Printf("Gin sunucusu düzgün kapatılamadı: %v", err)
	// }

	log.Println("Recommender servisi başarıyla kapatıldı.")
}

// setupRouter, Gin router'ını ve endpoint'leri ayarlar (Clean Code)
func setupRouter(scoreHandler *handler.ScoreHandler, authMiddleware *middleware.AuthMiddleware) *gin.Engine {
	r := gin.Default()

	// API Endpoint'leri
	api := r.Group("/api")
	api.Use(authMiddleware.ValidateToken) // Bu gruptaki her şey 'auth' korumalı
	{
		// Hızlı (Asenkron) endpoint'ler
		api.POST("/onboarding", scoreHandler.HandleOnboarding)
		api.POST("/interaction", scoreHandler.HandleInteraction)

		// Yavaş (Senkron) endpoint
		api.POST("/rebuild-cache", scoreHandler.HandleRebuildCache)

		api.GET("/recommendations/:user_id", scoreHandler.HandleGetRecommendations)
	}

	// Ping (Sağlık) testi
	r.GET("/ping", func(c *gin.Context) {
		dbStatus := "connected"
		if err := database.DB.Ping(c.Request.Context()); err != nil {
			dbStatus = "disconnected"
		}
		redisStatus := "connected"
		if _, err := cache.RDB.Ping(c.Request.Context()).Result(); err != nil {
			redisStatus = "disconnected"
		}
		c.JSON(http.StatusOK, gin.H{
			"message":      "pong",
			"service":      "Recommender Service (Go)",
			"db_status":    dbStatus,
			"cache_status": redisStatus,
		})
	})
	return r
}
