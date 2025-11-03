package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// LoadConfig, .env dosyasını yükler. main.go'da ilk bu çağrılacak.
func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env dosyası bulunamadı, ortam değişkenleri kullanılacak.")
	}
}

// Get, bir ayar değişkenini .env'den (veya ortamdan) okur.
func Get(key string) string {
	return os.Getenv(key)
}
