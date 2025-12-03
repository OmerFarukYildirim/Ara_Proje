/*package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"recommender/entity"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ScoreRepository artık iki veritabanı istemcisini de tutar
type ScoreRepository struct {
	db  *pgxpool.Pool // PostgreSQL (Loglama için)
	rdb *redis.Client // Redis (Hız için)
}

// NewScoreRepository, her iki istemciyi de enjekte eder
func NewScoreRepository(db *pgxpool.Pool, rdb *redis.Client) *ScoreRepository {
	return &ScoreRepository{db: db, rdb: rdb}
}

// redisKey, user_id için standart bir key oluşturur (örn: "user_score:12345")
func (r *ScoreRepository) redisKey(userID int64) string {
	return fmt.Sprintf("user_score:%d", userID)
}

// GetUserScoresFromCache, bir kullanıcının skorlarını Redis'ten (HIZLI) çeker.
func (r *ScoreRepository) GetUserScoresFromCache(ctx context.Context, userID int64) (*entity.UserScore, error) {
	key := r.redisKey(userID)

	var score entity.UserScore

	// HGetAll komutunu çalıştır ve sonucu doğrudan struct'a 'Scan' et
	if err := r.rdb.HGetAll(ctx, key).Scan(&score); err != nil {
		return nil, err
	}

	// 'Scan' başarılı ama 'UserID' 0 ise, bu key'in Redis'te olmadığı anlamına gelir
	if score.UserID == 0 {
		return nil, redis.Nil // Kullanıcı bulunamadı (nil)
	}

	return &score, nil
}

// SetScoresInCache, bir kullanıcının tüm skorlarını Redis'e (HIZLI) yazar.
// 'UserScore' struct'ını alır ve 'HSet' komutuyla bir Hash'e çevirir.
func (r *ScoreRepository) SetScoresInCache(ctx context.Context, score *entity.UserScore) error {
	key := r.redisKey(score.UserID)

	// 'HSet' komutu struct'ı (reflection kullanarak) otomatik olarak
	// field:value (alan:değer) şeklinde Redis'e yazar.
	if err := r.rdb.HSet(ctx, key, score).Err(); err != nil {
		return err
	}

	// (Opsiyonel) Skora bir "ömür" (TTL) verebilirsin, örn: 30 gün
	r.rdb.Expire(ctx, key, 30*24*time.Hour)

	return nil
}

// LogInteractionToDB, ham etkileşimi PostgreSQL'e (GÜVENLİ) yazar.
func (r *ScoreRepository) LogInteractionToDB(ctx context.Context, userID int64, eventType string, category string, data interface{}) error {

	// Gelen 'data'yı (struct veya map olabilir) JSON'a çevir
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("JSON loglama hatası: %w", err)
	}

	query := `
		INSERT INTO interaction_events (user_id, event_type, category_name, event_data)
		VALUES ($1, $2, $3, $4)
	`

	_, err = r.db.Exec(ctx, query, userID, eventType, category, jsonData)
	if err != nil {
		return fmt.Errorf("PostgreSQL loglama hatası: %w", err)
	}
	return nil
}
*/

package repository

import (
	"context"
	"encoding/json"
	"fmt"                // Bizim DB bağlantımız
	"recommender/entity" // Bizim UserScore modelimiz
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ScoreRepository, iki veritabanı istemcisini de tutar
type ScoreRepository struct {
	db  *pgxpool.Pool // PostgreSQL (Loglama için)
	rdb *redis.Client // Redis (Hız için)
}

// NewScoreRepository, her iki istemciyi de enjekte eder
func NewScoreRepository(db *pgxpool.Pool, rdb *redis.Client) *ScoreRepository {
	return &ScoreRepository{db: db, rdb: rdb}
}

// redisKey, user_id için standart bir key oluşturur (örn: "user_score:12345")
func (r *ScoreRepository) redisKey(userID int64) string {
	return fmt.Sprintf("user_score:%d", userID)
}

// GetUserScoresFromCache, bir kullanıcının skorlarını Redis'ten çeker.
func (r *ScoreRepository) GetUserScoresFromCache(ctx context.Context, userID int64) (*entity.UserScore, error) {
	key := r.redisKey(userID)
	var score entity.UserScore

	if err := r.rdb.HGetAll(ctx, key).Scan(&score); err != nil {
		return nil, err
	}

	if score.UserID == 0 {
		return nil, redis.Nil // Redis'te key yoksa 'Scan' hata vermez, 'UserID' 0 olur.
	}
	return &score, nil
}

// SetScoresInCache, bir kullanıcının tüm skorlarını Redis'e yazar.
func (r *ScoreRepository) SetScoresInCache(ctx context.Context, score *entity.UserScore) error {
	key := r.redisKey(score.UserID)
	// 'HSet' komutu struct'ı (reflection kullanarak) otomatik olarak
	// field:value (alan:değer) şeklinde Redis'e yazar.
	if err := r.rdb.HSet(ctx, key, score).Err(); err != nil {
		return err
	}
	// Skorlara 30 günlük bir ömür verelim (isteğe bağlı)
	r.rdb.Expire(ctx, key, 30*24*time.Hour)
	return nil
}

// LogInteractionToDB, ham etkileşimi PostgreSQL'e yazar.
func (r *ScoreRepository) LogInteractionToDB(ctx context.Context, userID int64, eventType string, category string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("JSON loglama hatası: %w", err)
	}

	query := `
		INSERT INTO interaction_events (user_id, event_type, category_name, event_data)
		VALUES ($1, $2, $3, $4)
	`
	_, err = r.db.Exec(ctx, query, userID, eventType, category, jsonData)
	if err != nil {
		return fmt.Errorf("PostgreSQL loglama hatası: %w", err)
	}
	return nil
}

// --- YENİ EKLENEN FONKSİYONLAR (KURTARMA İÇİN) ---

// InteractionData, Postgres'ten okunan ham log kaydıdır.
type InteractionData struct {
	EventType string // "onboarding" veya "interaction"
	EventData []byte // Ham JSON
}

// GetDistinctUserIDs, 'interaction_events' tablosundaki tüm benzersiz
// kullanıcı ID'lerini çeker.
func (r *ScoreRepository) GetDistinctUserIDs(ctx context.Context) ([]int64, error) {
	query := "SELECT DISTINCT user_id FROM interaction_events"
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("GetDistinctUserIDs sorgu hatası: %w", err)
	}
	defer rows.Close()

	var userIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("ID tarama hatası: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	return userIDs, nil
}

// score_repository.go (GetInteractionsForUser fonksiyonunun altına ekleyin)

// GetInteractionsForUserSince, belirli bir zaman noktasından SONRAKİ
// (created_at > givenTime) TÜM etkileşimleri zaman sıralı olarak çeker.
func (r *ScoreRepository) GetInteractionsForUserSince(ctx context.Context, userID int64, givenTime time.Time) ([]InteractionData, error) {
	// Sorgu, event_type ve event_data'yı çeker.
	query := `
		SELECT event_type, event_data
		FROM interaction_events
		WHERE user_id = $1 AND created_at > $2
		ORDER BY created_at ASC
	`
	// givenTime zero time ise (yani hiç sıfırlama yoksa), created_at > zero time
	// tüm kayıtları çekecektir, bu da istediğimiz davranıştır.
	rows, err := r.db.Query(ctx, query, userID, givenTime)
	if err != nil {
		return nil, fmt.Errorf("GetInteractionsForUserSince sorgu hatası: %w", err)
	}
	defer rows.Close()

	var events []InteractionData
	for rows.Next() {
		var ev InteractionData
		if err := rows.Scan(&ev.EventType, &ev.EventData); err != nil {
			return nil, fmt.Errorf("Etkileşim tarama hatası: %w", err)
		}
		events = append(events, ev)
	}
	return events, nil
}

// GetUserScores, bir kullanıcının tüm skorlarını Redis'ten (HGETALL) çeker.
func (r *ScoreRepository) GetUserScores(ctx context.Context, userID int64) (map[string]string, error) {
	key := fmt.Sprintf("user_score:%d", userID) // user_score:5

	// HGETALL komutu, Redis'teki o 'key' altındaki tüm alanları (kategorileri)
	// ve değerlerini (skorları) bir map olarak döner.
	scores, err := r.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("kullanıcı skoru bulunamadı (UserID: %d)", userID)
		}
		return nil, fmt.Errorf("Redis HGETALL hatası: %w", err)
	}

	return scores, nil
}


// LogUserResetEvent, belirli bir kullanıcının skorlarının sıfırlandığına dair bir log kaydı atar.
func (r *ScoreRepository) LogUserResetEvent(ctx context.Context, userID int64) error {
	
	query := `
		INSERT INTO interaction_events (user_id, event_type, category_name, event_data)
		VALUES ($1, $2, $3, $4)
	`
	
	// event_data: Sıfırlama işlemine dair bilgi
	resetData := map[string]string{"message": "User scores reset to 10.0 via API call."}
	jsonData, _ := json.Marshal(resetData)

	// user_id'ye ait bir 'score_reset' olayı logluyoruz.
	_, err := r.db.Exec(ctx, query, userID, "score_reset", "system_reset", jsonData)
	if err != nil {
		return fmt.Errorf("PostgreSQL sıfırlama loglama hatası: %w", err)
	}
	return nil
}

// GetLastResetTime, belirli bir kullanıcının en son gerçekleşen 'score_reset' olayının zamanını döner.
func (r *ScoreRepository) GetLastResetTime(ctx context.Context, userID int64) (time.Time, error) { // <-- userID eklendi
	query := `
		SELECT created_at
		FROM interaction_events
		WHERE user_id = $1 AND event_type = 'score_reset'
		ORDER BY created_at DESC
		LIMIT 1
	`
	var lastResetTime time.Time
	
	// QueryRowContext ile tek bir satır çekeriz
	err := r.db.QueryRow(ctx, query, userID).Scan(&lastResetTime) // <-- userID kullanılıyor
	
	if err != nil {
		// Hata olsa bile Go'nun zero time'ı döneriz, bu da rebuild'in tüm geçmişi okumasına izin verir.
		return lastResetTime, nil 
	}
	
	return lastResetTime, nil
}
