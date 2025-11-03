package main

import (
	"log"

	"github.com/gin-gonic/gin"

	// --- Proje Paketlerimizi Import Ediyoruz ---
	"recommender/config"   // Ayarlar (config)
	"recommender/database" // Veritabanı (database)
	"recommender/handler"  // API Katmanı (handler)
	"recommender/middleware"
	"recommender/repository" // Veritabanı Sorguları (repository)
	"recommender/service"    // İş Mantığı (service)
	// <-- YENİ IMPORT
)

func main() {
	// 1. Ayarları Yükle (Her şeyden önce)
	config.LoadConfig()

	// 2. Veritabanını Başlat (Bağlanır ve tabloyu oluşturur)
	database.Init()

	// 3. Katmanları Birbirine Bağla (Dependency Injection)
	// En alttan (repository) en üste (handler) doğru:

	// 3a. Repository katmanını oluştur (Veritabanı ile konuşur)
	scoreRepo := repository.NewScoreRepository()

	// 3b. Service katmanını oluştur (İş mantığı)
	// Not: Service, Repository'ye ihtiyaç duyar (ona bağımlıdır)
	scoreService := service.NewScoreService(scoreRepo)

	// 3c. Handler katmanını oluştur (API)
	// Not: Handler, Service'e ihtiyaç duyar (ona bağımlıdır)
	scoreHandler := handler.NewScoreHandler(scoreService)

	// 3d. Auth Middleware'i oluştur (Ayarları .env'den okur)
	authMiddleware := middleware.NewAuthMiddleware()
	// --- BİTTİ ---

	// 4. Gin (Web Sunucusu) router'ını başlat
	r := gin.Default()

	// 5. API Endpoint'lerini Tanımla
	api := r.Group("/api")
	{
		// BU İKİ ENDPOINT ARTIK KORUMALI
		// Her istek önce authMiddleware.ValidateToken'dan geçmek ZORUNDA
		api.POST("/onboarding", authMiddleware.ValidateToken, scoreHandler.HandleOnboarding)
		api.POST("/interaction", authMiddleware.ValidateToken, scoreHandler.HandleInteraction)
	}

	// Ping testi (Sunucunun ayakta olup olmadığını kontrol eder)
	r.GET("/ping", func(c *gin.Context) {
		dbStatus := "connected"
		if err := database.DB.Ping(c.Request.Context()); err != nil {
			dbStatus = "disconnected"
		}
		c.JSON(200, gin.H{
			"message":   "pong",
			"service":   "Recommender Service (Go)",
			"db_status": dbStatus,
		})
	})

	// 6. Servisi çalıştır
	port := config.Get("PORT") // Port'u .env'den oku
	if port == "" {
		port = "8004" // Varsayılan port
	}

	log.Printf("Recommender servisi http://localhost:%s adresinde başlatılıyor...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
