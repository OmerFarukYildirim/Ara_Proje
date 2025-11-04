package database

import (
	"context"
	"log"

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

// migrateDB, artık 'interaction_events' tablosunu oluşturur.
// 'user_scores' tablosunu SİLDİK.
func migrateDB() {

	// Not: Eğer 'user_scores' tablon varsa, DBeaver'dan DROP TABLE ile sil.

	// Ham etkileşimleri loglamak için yeni tablo
	// (JSONB tipi, gelen tüm JSON'u saklamak için çok güçlüdür)
	schema := `
	CREATE TABLE IF NOT EXISTS interaction_events (
		event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id BIGINT NOT NULL,
		category_name VARCHAR(100),
		event_type VARCHAR(50), -- 'onboarding', 'like', 'dislike', 'share' vs.
		event_data JSONB, -- Frontend'den gelen JSON'un tamamı
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	
	-- Hızlı sorgular için user_id'ye index at
	CREATE INDEX IF NOT EXISTS idx_interaction_user_id ON interaction_events (user_id);
	`

	_, err := DB.Exec(context.Background(), schema)
	if err != nil {
		log.Fatalf("Tablo oluşturulamadı (migrateDB): %v\n", err)
	}

	log.Println("Veritabanı şeması (interaction_events) başarıyla doğrulandı/oluşturuldu.")
}
