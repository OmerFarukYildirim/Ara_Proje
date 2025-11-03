package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"recommender/config"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware, ayarları tutar (Değişiklik yok)
type AuthMiddleware struct {
	AuthServiceURL string
	ApiClientKey   string
}

// NewAuthMiddleware, ayarları .env'den okur (Değişikİik yok)
func NewAuthMiddleware() *AuthMiddleware {
	return &AuthMiddleware{
		AuthServiceURL: config.Get("AUTH_SERVICE_URL"),
		ApiClientKey:   config.Get("TRUSTED_API_KEY"),
	}
}

// --- BU İKİ STRUCT YENİ ---
// Spring'den gelen UserDTO'yu (data içinde) yakalamak için
type AuthUserDTO struct {
	UserID int64 `json:"id"` // Spring'in "id" döndüğünü varsayıyoruz
	// (email vb. diğer alanlara ihtiyacımız yok)
}

// Spring'den gelen 'Response<UserDTO>' zarfını yakalamak için
type AuthSpringResponse struct {
	StatusCode int         `json:"statusCode"`
	Message    string      `json:"message"`
	Data       AuthUserDTO `json:"data"` // İç içe yapı (Nested structure)
}

// --- BİTTİ ---

// ValidateToken, bizim ana ara katman fonksiyonumuzdur
func (m *AuthMiddleware) ValidateToken(c *gin.Context) {

	// 1. KONTROL: X-API-Key (Değişiklik yok)
	apiKey := c.GetHeader("X-API-Key")
	if apiKey != m.ApiClientKey {
		log.Println("Hata: Geçersiz X-API-Key:", apiKey)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz API Anahtarı"})
		return
	}

	// 2. KONTROL: Bearer Token (Değişiklik yok)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header eksik"})
		return
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Bearer token formatı yanlış"})
		return
	}

	// 3. KONTROL: Token'ı Auth Servisine (Spring) Sor

	// --- DEĞİŞİKLİK BURADA ---
	// HTTP isteği oluştur (Senin endpoint'in: /api/users/account)
	req, _ := http.NewRequest("GET", m.AuthServiceURL+"/api/users/account", nil)

	// Bu isteğe, istemciden gelen token'ı ekle
	req.Header.Add("Authorization", "Bearer "+token)
	// Auth servisinin /account endpoint'i, bu header'ı okuyacak
	// (Spring SecurityContextHolder)
	// --- DEĞİŞİKLİK BİTTİ ---
	req.Header.Add("X-API-Key", m.ApiClientKey)

	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		log.Printf("Auth servisine bağlanılamadı: %v", err)
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Auth servisine ulaşılamıyor"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Auth servisi token'ı reddetti (StatusCode: %d)", resp.StatusCode)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz veya süresi dolmuş token"})
		return
	}

	// --- DEĞİŞİKLİK BURADA (JSON PARSE) ---
	// Auth servisinden gelen { "data": { "id": 5 } } yanıtını parse et
	var authResponse AuthSpringResponse // Yeni 'zarf' struct'ımızı kullan

	if err := json.NewDecoder(resp.Body).Decode(&authResponse); err != nil {
		log.Printf("Auth servisinin yanıtı anlaşılamadı: %v", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Auth yanıtı parse edilemedi"})
		return
	}

	// ID'yi 'data' zarfının içinden al
	userID := authResponse.Data.UserID
	if userID == 0 {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Auth yanıtından 'id' alınamadı"})
		return
	}
	// --- DEĞİŞİKLİK BİTTİ ---

	// 4. BAŞARILI: Kullanıcı ID'sini Gin Context'e Göm (Değişiklik yok)
	c.Set("userID", userID)
	c.Next()
}
