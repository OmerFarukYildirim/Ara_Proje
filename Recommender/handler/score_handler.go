/*package handler

import (
	"log"
	"net/http"            // HTTP durum kodları için (örn: 400, 500)
	"recommender/service" // Bizim 'service' paketimiz

	"github.com/gin-gonic/gin"
)

// ScoreHandler, service katmanına olan bağımlılığı tutar.
type ScoreHandler struct {
	service *service.ScoreService
}

// NewScoreHandler, service'i enjekte ederek yeni bir handler oluşturur.
// (Bu, 'Dependency Injection' - Bağımlılık Enjeksiyonu'dur)
func NewScoreHandler(s *service.ScoreService) *ScoreHandler {
	return &ScoreHandler{service: s}
}

// --- 1. ENDPOINT: Başlangıç Seçimi (Onboarding) ---

// HandleOnboarding, POST /api/onboarding isteğini yakalar.
func (h *ScoreHandler) HandleOnboarding(c *gin.Context) {
	// Gelen JSON'u, service katmanımızdaki 'OnboardingInput' struct'ına bağla
	var input service.OnboardingInput

	// JSON bağlama hatası olursa (örn: user_id yerine userid yazılmışsa)
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("Hata: Geçersiz Onboarding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON yapısı: " + err.Error()})
		return
	}

	// --- GÜVENLİK DEĞİŞİKLİĞİ ---
	// UserID'yi JSON'dan değil, Middleware Context'inden al
	userID, exists := c.Get("userID")
	if !exists {
		// Middleware'de bir hata olduysa (olmamalı ama kontrol edelim)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Auth context'i bulunamadı"})
		return
	}

	// Gelen 'input' struct'ına UserID'yi biz kendimiz set ediyoruz
	input.UserID = userID.(int64)
	// --- BİTTİ ---

	// JSON geçerliyse, işi 'service' katmanına pasla
	err := h.service.ProcessOnboarding(c.Request.Context(), &input)

	// 'service' katmanı bir hata döndürürse (örn: veritabanı hatası)
	if err != nil {
		log.Printf("Hata: Onboarding işlenemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Skorlar kaydedilemedi: " + err.Error()})
		return
	}

	// Her şey başarılıysa, 200 OK (Başarılı) yanıtı dön
	c.JSON(http.StatusOK, gin.H{"status": "success", "user_id": input.UserID})
}

// --- 2. ENDPOINT: Etkileşim Takibi (Interaction) ---

// HandleInteraction, POST /api/interaction isteğini yakalar.
func (h *ScoreHandler) HandleInteraction(c *gin.Context) {
	// Gelen JSON'u, service katmanımızdaki 'InteractionInput' struct'ına bağla
	var input service.InteractionInput

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("Hata: Geçersiz Interaction JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON yapısı: " + err.Error()})
		return
	}

	// --- GÜVENLİK DEĞİŞİKLİĞİ ---
	// UserID'yi JSON'dan değil, Middleware Context'inden al
	userID, _ := c.Get("userID") // Zaten var olduğunu biliyoruz
	input.UserID = userID.(int64)
	// --- BİTTİ ---

	// JSON geçerliyse, işi 'service' katmanına (algoritmanın olduğu yer) pasla
	err := h.service.ProcessInteraction(c.Request.Context(), &input)

	// 'service' katmanı bir hata döndürürse
	if err != nil {
		log.Printf("Hata: Etkileşim işlenemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Skor güncellenemedi: " + err.Error()})
		return
	}

	// Başarılı
	c.JSON(http.StatusOK, gin.H{"status": "score_updated"})
}*/

package handler

import (
	"context"       // Arka plan 'rebuild' işlemi için
	"encoding/json" // Kafka'ya JSON yollamak için
	"log"
	"fmt"
	"net/http"
	"recommender/config"  // Topic (kuyruk) isimleri için
	"recommender/kafka"   // Yeni Kafka Producer
	"recommender/service" // Input struct'ları ve 'Rebuild' için

	"github.com/gin-gonic/gin"
)

// ScoreHandler, artık hem Kafka'ya hızlı yazmak (Producer)
// hem de yavaş işlemleri (Rebuild) tetiklemek için Service'e bağımlıdır.
type ScoreHandler struct {
	producer *kafka.Producer
	service  *service.ScoreService
}

// NewScoreHandler, her iki bağımlılığı da enjekte eder (Dependency Injection).
func NewScoreHandler(p *kafka.Producer, s *service.ScoreService) *ScoreHandler {
	return &ScoreHandler{producer: p, service: s}
}

// --- 1. ENDPOINT: Onboarding (Kafka'ya Atar - HIZLI) ---
func (h *ScoreHandler) HandleOnboarding(c *gin.Context) {
	var input service.OnboardingInput

	// 1. JSON'u al (input.UserID eğer JSON'da varsa burada dolacak)
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON yapısı: " + err.Error()})
		return
	}

	// 2. Auth Middleware'den UserID gelmiş mi kontrol et (JWT durumunda gelir)
	// EĞER X-API-KEY İLE GELDİYSE BURASI BOŞ OLABİLİR VE BU NORMALDİR.
	if userIDValue, exists := c.Get("userID"); exists {
		// Eğer context'te varsa, JSON'dan geleni ez (güvenlik için)
		if id, ok := userIDValue.(int64); ok {
			input.UserID = id
		}
	}

	// 🚨 YENİ EKLEME: AuthHeader'ı al ve struct'a ekle
	authHeader := c.GetHeader("Authorization") // Örn: "Bearer eyJ..."
	input.AuthHeader = authHeader // Yeni alana kaydet
	
	// 3. Son Kontrol: UserID hala 0 ise (ne JSON'dan ne Context'ten gelmediyse) hata ver
	if input.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kullanıcı ID (user_id) eksik"})
		return
	}

	// 3. Kafka'ya yollanacak mesajı hazırla
	messageBytes, err := json.Marshal(input)
	if err != nil {
		log.Printf("Hata: Onboarding JSON Marshal edilemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Mesaj oluşturulamadı"})
		return
	}

	// 4. Kafka'ya "ateşle"
	topic := config.Get("KAFKA_TOPIC_ONBOARDING")
	if err := h.producer.Publish(topic, messageBytes); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Olay iletilemedi (Kafka)"})
		return
	}

	// 5. Kullanıcıyı bekletme! (Asenkron)
	c.JSON(http.StatusAccepted, gin.H{"status": "Onboarding isteği kabul edildi."})
}

// --- 2. ENDPOINT: Interaction (Kafka'ya Atar - HIZLI) ---
func (h *ScoreHandler) HandleInteraction(c *gin.Context) {
	var input service.InteractionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON: " + err.Error()})
		return
	}

	if userIDValue, exists := c.Get("userID"); exists {
		if id, ok := userIDValue.(int64); ok {
			input.UserID = id
		}
	}

	if input.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kullanıcı ID eksik"})
		return
	}

	// 3. Kafka'ya yollanacak mesajı hazırla
	messageBytes, err := json.Marshal(input)
	if err != nil {
		log.Printf("Hata: Interaction JSON Marshal edilemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Mesaj oluşturulamadı"})
		return
	}

	// 4. Kafka'ya "ateşle"
	topic := config.Get("KAFKA_TOPIC_INTERACTION")
	if err := h.producer.Publish(topic, messageBytes); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Etkileşim iletilemedi (Kafka)"})
		return
	}

	// 5. Kullanıcıyı bekletme! (Asenkron)
	c.JSON(http.StatusAccepted, gin.H{"status": "Etkileşim kabul edildi."})
}

// --- 3. ENDPOINT: Kurtarma (Doğrudan Service'i Çağırır - YAVAŞ) ---
func (h *ScoreHandler) HandleRebuildCache(c *gin.Context) {
	log.Println("Redis kurtarma (Rebuild) isteği alındı...")

	// İşlemi asenkron (arka planda) başlat
	go func() {
		// HTTP isteğinden bağımsız yeni bir context oluştur
		ctx := context.Background()
		processedCount, err := h.service.RebuildAllScores(ctx)
		if err != nil {
			log.Printf("KRİTİK HATA: Arka plan Redis kurtarma işlemi başarısız: %v", err)
		} else {
			log.Println("Arka plan Redis kurtarma işlemi başarıyla tamamlandı. İşlenen kullanıcı: ", processedCount)
		}
	}()

	// Kullanıcıya "işlem başladı" de
	c.JSON(http.StatusAccepted, gin.H{
		"status": "Kurtarma (Rebuild) işlemi arka planda başlatıldı.",
	})
}

// YENİ: GET /api/recommendations/:user_id
func (h *ScoreHandler) HandleGetRecommendations(c *gin.Context) {
	// Middleware (artık X-API-Key'i de destekliyor) 'userID'yi zaten context'e ekledi.
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "UserID context'te bulunamadı"})
		return
	}

	rankedCategories, err := h.service.GetRankedCategories(c.Request.Context(), userID.(int64))
	if err != nil {
		log.Printf("Hata: Sıralı kategoriler alınamadı: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı skorları bulunamadı: " + err.Error()})
		return
	}

	// Başarılı: Python servisine sıralı listeyi dön
	c.JSON(http.StatusOK, gin.H{"categories": rankedCategories})
}


// --- 5. ENDPOINT: Belirli Kullanıcının Skorlarını Sıfırla ---

// HandleResetUserScores, POST /api/reset-scores isteğini yakalar.
// User ID'yi context'ten (JWT/Auth Middleware) alır ve o kullanıcının Redis skorlarını sıfırlar.
func (h *ScoreHandler) HandleResetUserScores(c *gin.Context) {
    // 1. User ID'yi Context'ten (Middleware'den) al
    userID, exists := c.Get("userID")
    if !exists {
        // Bu, middleware'in çalışmadığı veya JWT'nin decode edilemediği anlamına gelir.
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı kimliği (JWT) doğrulanamadı."})
        return
    }
    
    // Güvenlik: userID'nin int64 olduğundan emin ol
    id, ok := userID.(int64)
    if !ok || id == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz Kullanıcı ID formatı."})
        return
    }

    log.Printf("Kullanıcı %d için skor SIFIRLAMA isteği alındı...", id)

    // 2. İşlemi asenkron (arka planda) başlat
    go func() {
        ctx := context.Background()
        // Servis katmanında sadece tek bir kullanıcıyı sıfırlayan yeni fonksiyonu çağırıyoruz.
        err := h.service.ResetUserScoresToDefault(ctx, id) 
        
        if err != nil {
            log.Printf("KRİTİK HATA: Kullanıcı %d için skor sıfırlama işlemi başarısız: %v", id, err)
        } else {
            log.Printf("✅ Kullanıcı %d için skor sıfırlama işlemi başarıyla tamamlandı.", id)
        }
    }()

    // 3. Kullanıcıya "işlem başladı" de (202 Accepted)
    c.JSON(http.StatusAccepted, gin.H{
        "status": fmt.Sprintf("Kullanıcı %d skorları varsayılan değere sıfırlanıyor (arka planda).", id),
    })
}
