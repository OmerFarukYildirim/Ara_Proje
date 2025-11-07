package middleware

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"recommender/config"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	authServiceURL string
	trustedApiKey  string
}

func NewAuthMiddleware() *AuthMiddleware {
	return &AuthMiddleware{
		authServiceURL: config.Get("AUTH_SERVICE_URL"),
		trustedApiKey:  config.Get("TRUSTED_API_KEY"),
	}
}

type AuthUserData struct {
	ID int64 `json:"id"`
}

type AuthResponse struct {
	StatusCode int          `json:"statusCode"`
	Message    string       `json:"message"`
	Data       AuthUserData `json:"data"`
}

func (m *AuthMiddleware) ValidateToken(c *gin.Context) {

	// 1. ÖNCELİK: Kullanıcı Token'ı (Bearer) Kontrolü
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		// Token varsa, MUTLAKA geçerli olmalı.
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Bearer token formatı yanlış"})
			return
		}
		token := parts[1]

		req, _ := http.NewRequest("GET", m.authServiceURL+"/api/users/account", nil)
		req.Header.Add("Authorization", "Bearer "+token)
		// Auth servisi X-API-Key istiyorsa onu da ekleyelim
		req.Header.Add("X-API-Key", m.trustedApiKey)

		client := &http.Client{}
		resp, err := client.Do(req)

		if err != nil {
			log.Printf("Auth servisine ulaşılamadı: %v", err)
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Auth servisine ulaşılamadı"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz veya süresi dolmuş token"})
			return
		}

		bodyBytes, _ := io.ReadAll(resp.Body)
		var authResp AuthResponse
		if err := json.Unmarshal(bodyBytes, &authResp); err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Auth yanıt hatası"})
			return
		}

		if authResp.Data.ID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı ID'si alınamadı"})
			return
		}

		// Başarılı: ID'yi kaydet ve devam et
		c.Set("userID", authResp.Data.ID)
		c.Next()
		return
	}

	// 2. ÖNCELİK: Servis Anahtarı (X-API-Key) Kontrolü
	// (Eğer token yoksa buraya düşeriz)
	apiKey := c.GetHeader("X-API-Key")
	if apiKey != "" {
		if apiKey == m.trustedApiKey {
			// Servisler arası çağrı (örn: content-finder -> recommender)
			// URL'den user_id parametresi varsa onu al
			if strings.HasPrefix(c.Request.URL.Path, "/api/recommendations/") {
				parts := strings.Split(c.Request.URL.Path, "/")
				if len(parts) > 0 {
					if userID, err := strconv.ParseInt(parts[len(parts)-1], 10, 64); err == nil {
						c.Set("userID", userID)
					}
				}
			}
			c.Next()
			return
		}
	}

	// 3. HİÇBİRİ YOKSA: Hata
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Yetkisiz erişim: Token veya API Key gerekli"})
}
