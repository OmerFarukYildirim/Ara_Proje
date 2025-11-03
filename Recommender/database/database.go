package database

import (
	"context"
	"log"
	"strings"

	"recommender/config" // Kendi config paketimiz

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Init() {
	dbURL := config.Get("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL .env dosyasında ayarlanmamış.")
	}

	var err error
	DB, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("PostgreSQL'e bağlanılamadı: %v\n", err)
	}

	if err := DB.Ping(context.Background()); err != nil {
		log.Fatal(err)
	}

	log.Println("PostgreSQL'e başarıyla bağlandı.")
	migrateDB()
}

// migrateDB, veritabanı şemasını (tabloları) oluşturur.
// SQL tipleri (BIGINT, REAL) isteğine göre güncellendi.
func migrateDB() {
	// Kategori listesi (değişiklik yok)
	categories := []string{
		"technology_score",
		"sports_score",
		"art_score",
		"music_score",
		"science_score",
		"travel_score",
		"food_score",
		"movie_score",
		"book_score",
		"fashion_score",
		"game_score",
		"nature_score",
		"photography_score",
		"education_score",
		"health_score",
		"economy_score",
	}

	// SQL sorgusunu dinamik olarak oluştur
	// (örn: "technology_score REAL DEFAULT 0.0, ...")
	var scoreColumns []string
	for _, category := range categories {
		// int -> REAL, DEFAULT 0 -> 0.0
		scoreColumns = append(scoreColumns, category+" REAL DEFAULT 0.0")
	}

	// SQL şemasını hazırla
	schema := `
	CREATE TABLE IF NOT EXISTS user_scores (
		user_id BIGINT PRIMARY KEY, -- VARCHAR(255) -> BIGINT (long)
		` + strings.Join(scoreColumns, ",\n") + `
	);`

	// SQL'i veritabanında çalıştır
	_, err := DB.Exec(context.Background(), schema)
	if err != nil {
		log.Fatalf("Tablo oluşturulamadı (migrateDB): %v\n", err)
	}

	log.Println("Veritabanı şeması (user_scores) başarıyla doğrulandı/oluşturuldu. (Tipler: BIGINT, REAL)")
}
