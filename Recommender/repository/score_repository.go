package repository

import (
	"context"
	"fmt"
	"recommender/database" // Bizim DB bağlantımız
	"recommender/entity"   // Bizim UserScore modelimiz
	"strings"
)

// ScoreRepository, veritabanı işlemleri için metotları tanımlar.
type ScoreRepository struct {
	// (Gelecekte buraya *pgxpool.Pool gibi bir DB bağlantısı eklenebilir
	//  ancak şimdilik database.DB global değişkenini kullanacağız)
}

// NewScoreRepository, yeni bir repository oluşturur (Şimdilik boş).
func NewScoreRepository() *ScoreRepository {
	return &ScoreRepository{}
}

// GetUserScores, bir kullanıcının TÜM skorlarını çeker.
// Eğer kullanıcı yoksa, 'nil' ve 'nil' (hata yok) döner.
func (r *ScoreRepository) GetUserScores(ctx context.Context, userID int64) (*entity.UserScore, error) {
	// (Go'da 16 sütunu da tek tek yazmak yerine '*' kullanmak
	//  bu senaryoda daha pratiktir, ancak normalde tavsiye edilmez)
	query := "SELECT * FROM user_scores WHERE user_id = $1"

	row := database.DB.QueryRow(ctx, query, userID)

	var score entity.UserScore

	// Scan, tüm sütunları entity/score.go'daki sıraya göre tarar.
	// Bu yüzden struct'taki sıralama önemlidir!
	err := row.Scan(
		&score.UserID,
		&score.TechnologyScore,
		&score.SportsScore,
		&score.ArtScore,
		&score.MusicScore,
		&score.ScienceScore,
		&score.TravelScore,
		&score.FoodScore,
		&score.MovieScore,
		&score.BookScore,
		&score.FashionScore,
		&score.GameScore,
		&score.NatureScore,
		&score.PhotographyScore,
		&score.EducationScore,
		&score.HealthScore,
		&score.EconomyScore,
	)

	if err != nil {
		// 'pgx.ErrNoRows' Go'da 'pgx' import etmeden
		// doğrudan 'err.Error() == "no rows in result set"' ile de kontrol edilebilir
		// ama en temizi 'Is' ile kontrol etmektir. Şimdilik basit tutalım.
		if err.Error() == "no rows in result set" {
			return nil, nil // Kullanıcı bulunamadı, bu bir hata değil.
		}
		// Gerçek bir veritabanı hatası
		return nil, fmt.Errorf("GetUserScores sorgu hatası: %w", err)
	}

	return &score, nil
}

// UpsertUserScores, bir kullanıcının skorlarını günceller veya yoksa oluşturur.
// Bu, "Başlangıç Seçimi" ve "Skor Güncelleme" için TEK fonksiyondur.
func (r *ScoreRepository) UpsertUserScores(ctx context.Context, score *entity.UserScore) error {
	// 16 kategorinin adları (SQL sütun adlarıyla aynı olmalı)
	categories := []string{
		"technology_score", "sports_score", "art_score", "music_score",
		"science_score", "travel_score", "food_score", "movie_score",
		"book_score", "fashion_score", "game_score", "nature_score",
		"photography_score", "education_score", "health_score", "economy_score",
	}

	// SQL'i dinamik olarak oluştur (INSERT ve ON CONFLICT DO UPDATE)

	// INSERT INTO user_scores(user_id, technology_score, ...)
	query := `
		INSERT INTO user_scores (
			user_id, ` + strings.Join(categories, ", ") + `
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
		ON CONFLICT (user_id) DO UPDATE SET
			technology_score = EXCLUDED.technology_score,
			sports_score = EXCLUDED.sports_score,
			art_score = EXCLUDED.art_score,
			music_score = EXCLUDED.music_score,
			science_score = EXCLUDED.science_score,
			travel_score = EXCLUDED.travel_score,
			food_score = EXCLUDED.food_score,
			movie_score = EXCLUDED.movie_score,
			book_score = EXCLUDED.book_score,
			fashion_score = EXCLUDED.fashion_score,
			game_score = EXCLUDED.game_score,
			nature_score = EXCLUDED.nature_score,
			photography_score = EXCLUDED.photography_score,
			education_score = EXCLUDED.education_score,
			health_score = EXCLUDED.health_score,
			economy_score = EXCLUDED.economy_score
	`

	// Değerleri doğru sırada 'args' listesine ekle
	args := []interface{}{
		score.UserID,
		score.TechnologyScore,
		score.SportsScore,
		score.ArtScore,
		score.MusicScore,
		score.ScienceScore,
		score.TravelScore,
		score.FoodScore,
		score.MovieScore,
		score.BookScore,
		score.FashionScore,
		score.GameScore,
		score.NatureScore,
		score.PhotographyScore,
		score.EducationScore,
		score.HealthScore,
		score.EconomyScore,
	}

	// SQL'i çalıştır
	_, err := database.DB.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("UpsertUserScores hatası: %w", err)
	}

	return nil
}
