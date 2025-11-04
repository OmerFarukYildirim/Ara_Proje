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
	"context" // Arka plan 'go' rutini için
	"log"
	"net/http"
	"recommender/service"

	"github.com/gin-gonic/gin"
)

type ScoreHandler struct {
	service *service.ScoreService
}

func NewScoreHandler(s *service.ScoreService) *ScoreHandler {
	return &ScoreHandler{service: s}
}

// --- 1. ENDPOINT: Başlangıç Seçimi (Onboarding) ---
func (h *ScoreHandler) HandleOnboarding(c *gin.Context) {
	var input service.OnboardingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON yapısı: " + err.Error()})
		return
	}

	// UserID'yi JSON'dan değil, Middleware Context'inden al
	userID, _ := c.Get("userID")
	input.UserID = userID.(int64) 

	err := h.service.ProcessOnboarding(c.Request.Context(), &input)
	if err != nil {
		log.Printf("Hata: Onboarding işlenemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Skorlar kaydedilemedi: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "user_id": input.UserID})
}

// --- 2. ENDPOINT: Etkileşim Takibi (Interaction) ---
func (h *ScoreHandler) HandleInteraction(c *gin.Context) {
	var input service.InteractionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz JSON yapısı: " + err.Error()})
		return
	}

	// UserID'yi JSON'dan değil, Middleware Context'inden al
	userID, _ := c.Get("userID")
	input.UserID = userID.(int64)

	err := h.service.ProcessInteraction(c.Request.Context(), &input)
	if err != nil {
		log.Printf("Hata: Etkileşim işlenemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Skor güncellenemedi: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "score_updated"})
}


// --- 3. ENDPOINT: Kurtarma (YENİ) ---

// HandleRebuildCache, POST /api/rebuild-cache isteğini yakalar.
// Admin paneli olmadığı için normal 'auth' ile korunur.
func (h *ScoreHandler) HandleRebuildCache(c *gin.Context) {
	log.Println("Redis kurtarma (Rebuild) isteği alındı...")

	// Bu işlem ÇOK UZUN sürebilir (milyonlarca kullanıcı/kayıt).
	// HTTP isteğinin timeout'a girmemesi için işlemi arka planda (go routine)
	// başlatıp, isteği atana hemen "işlem başladı" yanıtı dönmek
	// profesyonel bir yaklaşımdır (Asenkron İşlem).
	go func() {
		// Arka planda çalışacak olan işleme, HTTP isteğinden bağımsız
		// yeni bir 'context' veririz.
		_, err := h.service.RebuildAllScores(context.Background())
		if err != nil {
			log.Printf("KRİTİK HATA: Arka plan Redis kurtarma işlemi başarısız: %v", err)
		} else {
			log.Println("Arka plan Redis kurtarma işlemi başarıyla tamamlandı.")
		}
	}()
	
	// '202 Accepted': "İsteğini aldım, anladım, arka planda yapıyorum"
	c.JSON(http.StatusAccepted, gin.H{
		"status": "Kurtarma (Rebuild) işlemi arka planda başlatıldı.",
	})
}
