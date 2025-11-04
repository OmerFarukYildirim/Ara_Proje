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
	"log"

	"github.com/gin-gonic/gin"

	"recommender/cache"
	"recommender/config"
	"recommender/database"
	"recommender/handler"
	"recommender/middleware"
	"recommender/repository"
	"recommender/service"
)

func main() {
	// 1. Ayarları Yükle
	config.LoadConfig()

	// 2. Veritabanlarını Başlat
	database.Init() // PostgreSQL
	cache.Init()    // Redis

	// 3. Katmanları Birbirine Bağla (Dependency Injection)
	scoreRepo := repository.NewScoreRepository(database.DB, cache.RDB)
	scoreService := service.NewScoreService(scoreRepo)
	scoreHandler := handler.NewScoreHandler(scoreService)
	authMiddleware := middleware.NewAuthMiddleware()

	// 4. Gin (Web Sunucusu) router'ını başlat
	r := gin.Default()

	// 5. API Endpoint'lerini Tanımla
	api := r.Group("/api")
	api.Use(authMiddleware.ValidateToken) // Bu gruptaki her şey 'auth' korumalı
	{
		// Kullanıcıya yönelik endpoint'ler
		api.POST("/onboarding", scoreHandler.HandleOnboarding)
		api.POST("/interaction", scoreHandler.HandleInteraction)

		// --- YENİ ENDPOINT ---
		// Kurtarma (recovery) endpoint'i
		// POST http://localhost:8004/api/rebuild-cache
		api.POST("/rebuild-cache", scoreHandler.HandleRebuildCache)
	}

	// Ping testi
	r.GET("/ping", func(c *gin.Context) {
		dbStatus := "connected"
		if err := database.DB.Ping(c.Request.Context()); err != nil {
			dbStatus = "disconnected"
		}
		redisStatus := "connected"
		if _, err := cache.RDB.Ping(c.Request.Context()).Result(); err != nil {
			redisStatus = "disconnected"
		}
		c.JSON(200, gin.H{
			"message":      "pong",
			"service":      "Recommender Service (Go)",
			"db_status":    dbStatus,
			"cache_status": redisStatus,
		})
	})

	// 6. Servisi çalıştır
	port := config.Get("PORT")
	if port == "" {
		port = "8004"
	}

	log.Printf("Recommender servisi http://localhost:%s adresinde başlatılıyor...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
