/*package service

import (
	"context"
	"fmt"
	"log"
	"recommender/entity"
	"recommender/repository"
	"reflect"
	"strings"
)

// --- Skorlama Ayarları (Aynı) ---
const (
	MaxScore             float32 = 100.0
	MinScore             float32 = 0.0
	LearningRate         float32 = 5.0
	DefaultStartScore    float32 = 10.0
	OnboardingStartScore float32 = 50.0
	ScoreClampMin        float32 = 0.1
	ScoreClampMax        float32 = 99.9
)

// --- Input Modelleri (Aynı) ---
type InteractionInput struct {
	UserID             int64   `json:"-"` // Artık JSON'da değil, context'ten
	NewsID             string  `json:"news_id"`
	Category           string  `json:"category"`
	Like               string  `json:"like"`
	Dislike            string  `json:"dislike"`
	FirstSpendingTime  float32 `json:"first_spending_time"`
	ClickDetail        string  `json:"click_detail"`
	SecondSpendingTime float32 `json:"second_spending_time"`
	Share              string  `json:"share"`
}

type OnboardingInput struct {
	UserID     int64    `json:"-"` // Artık JSON'da değil, context'ten
	Categories []string `json:"categories"`
}

// --- Service ve Constructor (Aynı) ---
type ScoreService struct {
	repo *repository.ScoreRepository
}

func NewScoreService(r *repository.ScoreRepository) *ScoreService {
	return &ScoreService{repo: r}
}

// --- 1. İşlev: Başlangıç Seçimi (Onboarding) (Mantık değişti) ---
func (s *ScoreService) ProcessOnboarding(ctx context.Context, input *OnboardingInput) error {
	// 1. Varsayılan skorlarla bir struct oluştur (Aynı)
	newUserScore := entity.UserScore{UserID: input.UserID}
	v := reflect.ValueOf(&newUserScore).Elem()
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		if fieldType := t.Field(i).Type; fieldType.Kind() == reflect.Float32 {
			v.Field(i).SetFloat(float64(DefaultStartScore))
		}
	}
	// 2. Seçilenleri 50.0 yap (Aynı)
	for _, categoryName := range input.Categories {
		fieldName := s.formatCategoryToFieldName(categoryName)
		if err := s.setScoreByFieldName(&newUserScore, fieldName, OnboardingStartScore); err != nil {
			log.Printf("Uyarı: Geçersiz kategori adı (onboarding): %s", categoryName)
		}
	}

	// 3. YENİ: Skoru Redis'e Yaz
	if err := s.repo.SetScoresInCache(ctx, &newUserScore); err != nil {
		return fmt.Errorf("Redis'e onboarding skoru yazılamadı: %w", err)
	}

	// 4. YENİ: Bu olayı Postgres'e logla (Asenkron)
	// (Bu, ana isteği yavaşlatmaz, arka planda çalışır)
	go func() {
		err := s.repo.LogInteractionToDB(context.Background(), input.UserID, "onboarding", "", input)
		if err != nil {
			log.Printf("Hata: Onboarding loglanamadı (Postgres): %v", err)
		}
	}()

	return nil
}

// --- 2. İşlev: Etkileşim İşleme (Mantık değişti) ---
func (s *ScoreService) ProcessInteraction(ctx context.Context, input *InteractionInput) error {
	// 1. Ağırlık Hesapla (Aynı)
	eventWeight := s.calculateEventWeight(input)
	if eventWeight == 0 {
		return nil // Nötr etkileşim
	}

	// 2. YENİ: Skoru Redis'ten Getir
	currentScores, err := s.repo.GetUserScoresFromCache(ctx, input.UserID)

	// Kullanıcı Redis'te yoksa (ilk etkileşimi veya cache'i dolmuşsa)
	if err != nil {
		if err.Error() == "redis: nil" { // redis.Nil hatası
			log.Printf("Kullanıcı %d Redis'te bulunamadı, varsayılan skorlarla oluşturuluyor...", input.UserID)
			// Varsayılan (tümü 10.0) skorlarla bir 'onboarding' işlemi yap
			onboardingInput := &OnboardingInput{UserID: input.UserID, Categories: []string{}}
			if err := s.ProcessOnboarding(ctx, onboardingInput); err != nil { // Bu fonksiyon zaten Redis'e yazar
				return fmt.Errorf("yeni kullanıcı (Redis) oluşturulamadı: %w", err)
			}
			// Skoru tekrar çek
			currentScores, err = s.repo.GetUserScoresFromCache(ctx, input.UserID)
		}
		// Başka bir Redis hatası
		if err != nil {
			return fmt.Errorf("Redis'ten skor alınamadı: %w", err)
		}
	}

	// 3. S-Curve Algoritması (Aynı)
	categoryFieldName := s.formatCategoryToFieldName(input.Category)
	currentScore, err := s.getScoreByFieldName(currentScores, categoryFieldName)
	if err != nil {
		return fmt.Errorf("geçersiz kategori adı (interaction): %s", input.Category)
	}

	var factor float32
	if eventWeight > 0 {
		factor = (MaxScore - currentScore) / MaxScore
	} else {
		factor = currentScore / MaxScore
	}
	deltaScore := eventWeight * factor * LearningRate
	newScore := currentScore + deltaScore

	// 4. Sınırla (Clamping) (Aynı)
	if newScore > ScoreClampMax {
		newScore = ScoreClampMax
	}
	if newScore < ScoreClampMin {
		newScore = ScoreClampMin
	}

	// 5. YENİ: Yeni Skoru Struct'a Yaz (Aynı)
	s.setScoreByFieldName(currentScores, categoryFieldName, newScore)

	// 6. YENİ: Güncel Struct'ı Redis'e Geri Yaz (HIZLI)
	if err := s.repo.SetScoresInCache(ctx, currentScores); err != nil {
		return fmt.Errorf("Redis'e skor güncellenemedi: %w", err)
	}

	// 7. YENİ: Bu etkileşimi Postgres'e Logla (GÜVENLİ ve ASENKRON)
	go func() {
		err := s.repo.LogInteractionToDB(context.Background(), input.UserID, "interaction", input.Category, input)
		if err != nil {
			log.Printf("Hata: Etkileşim loglanamadı (Postgres): %v", err)
		}
	}()

	return nil
}

// --- Yardımcı Fonksiyonlar (Ağırlıklandırma ve Reflection) ---

// calculateEventWeight, JSON'u tek bir ağırlık skoruna çevirir.
func (s *ScoreService) calculateEventWeight(input *InteractionInput) float32 {
	var weight float32 = 0

	if input.Like == "yes" {
		weight += 1.0
	}
	if input.Dislike == "yes" {
		weight -= 1.5
	} // Dislike daha güçlü
	if input.Share == "yes" {
		weight += 0.8
	}
	if input.ClickDetail == "yes" {
		weight += 0.3
	}

	// Zaman (Hemen çıkma/Bounce)
	if input.SecondSpendingTime == 0 && input.FirstSpendingTime < 3 {
		weight -= 0.7
	}
	// Zaman (İlgili okuma)
	if input.SecondSpendingTime > 30 {
		weight += 0.5
	}
	return weight
}

// --- EKSİK KISIM 2: Diğer Yardımcı Fonksiyonlar ---

// formatCategoryToFieldName, "technology" gibi bir string'i
// Go struct'ındaki "TechnologyScore" alan adına çevirir.
func (s *ScoreService) formatCategoryToFieldName(category string) string {
	if category == "" {
		return ""
	}
	// Not: Bu basit çevirici, "technology" -> "TechnologyScore" yapar.
	// Eğer kategorilerin "technology_score" -> "TechnologyScore" gibi
	// daha karmaşık gelirse, burayı güncellememiz gerekir.
	// Şimdilik JSON'dan "technology", "sports" geldiğini varsayıyoruz.
	return strings.Title(category) + "Score"
}

// getScoreByFieldName, reflection kullanarak bir struct'tan 'field' adına göre skoru okur.
func (s *ScoreService) getScoreByFieldName(scores *entity.UserScore, fieldName string) (float32, error) {
	// reflect.ValueOf(scores) -> *UserScore'un (pointer) değerini alır
	// .Elem() -> Pointer'ı takip ederek asıl 'UserScore' struct'ına ulaşır
	v := reflect.ValueOf(scores).Elem()
	// FieldByName(fieldName) -> Struct içinden "TechnologyScore" alanını bulur
	field := v.FieldByName(fieldName)

	if !field.IsValid() {
		return 0, fmt.Errorf("geçersiz alan adı: %s", fieldName)
	}

	// Alanın 'float32' olduğunu varsayıyoruz (entity'miz öyle)
	return float32(field.Float()), nil
}

// setScoreByFieldName, reflection kullanarak bir struct'a 'field' adına göre skoru yazar.
func (s *ScoreService) setScoreByFieldName(scores *entity.UserScore, fieldName string, value float32) error {
	v := reflect.ValueOf(scores).Elem()
	field := v.FieldByName(fieldName)

	if !field.IsValid() {
		return fmt.Errorf("geçersiz alan adı: %s", fieldName)
	}

	if !field.CanSet() {
		return fmt.Errorf("alana değer atanamıyor (unexported?): %s", fieldName)
	}

	field.SetFloat(float64(value))
	return nil
}*/

package service

import (
	"context"
	"encoding/json" // Kurtarma fonksiyonu için
	"fmt"
	"io"
	"log"
	"net/http"
	"recommender/config"
	"recommender/entity"
	"recommender/repository"
	"reflect" // Struct'taki alanı isme göre bulmak için
	"sort"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9" // Hata kontrolü için
	// Sıralama için
	// String -> Float dönüşümü için
)

// --- Skorlama Ayarları (Aynı) ---
const (
	MaxScore             float32 = 100.0
	MinScore             float32 = 0.0
	LearningRate         float32 = 5.0
	DefaultStartScore    float32 = 10.0
	OnboardingStartScore float32 = 50.0
	ScoreClampMin        float32 = 0.1
	ScoreClampMax        float32 = 99.9
)

// YENİ: Sıralama için yardımcı struct
type rankedCategory struct {
	Name  string  `json:"category"`
	Score float64 `json:"score"`
}

// --- Input Modelleri (Aynı) ---
type InteractionInput struct {
	UserID             int64   `json:"user_id"` // <-- GÜNCELLENDİ (json:"-" DEĞİL)
	NewsID             string  `json:"news_id"`
	Category           string  `json:"category"`
	Like               string  `json:"like"`
	Dislike            string  `json:"dislike"`
	FirstSpendingTime  float32 `json:"first_spending_time"`
	ClickDetail        string  `json:"click_detail"`
	SecondSpendingTime float32 `json:"second_spending_time"`
	Share              string  `json:"share"`
}

type OnboardingInput struct {
	UserID     int64    `json:"user_id"` // <-- GÜNCELLENDİ (json:"-" DEĞİL)
	Categories []string `json:"categories"`

	AuthHeader string `json:"auth_header,omitempty"`
}

// --- Service ve Constructor (Aynı) ---
type ScoreService struct {
	repo *repository.ScoreRepository
}

func NewScoreService(r *repository.ScoreRepository) *ScoreService {
	return &ScoreService{repo: r}
}

// --- 1. İşlev: Başlangıç Seçimi (Refactor Edildi) ---
func (s *ScoreService) ProcessOnboarding(ctx context.Context, input *OnboardingInput, authHeader string) error {
	// 1. Boş skor struct'ı oluştur
	newUserScore := &entity.UserScore{UserID: input.UserID}

	// 2. Çekirdek "Onboarding" mantığını uygula
	s.applyOnboardingLogic(newUserScore, input)

	// 3. Skoru Redis'e Yaz
	if err := s.repo.SetScoresInCache(ctx, newUserScore); err != nil {
		return fmt.Errorf("Redis'e onboarding skoru yazılamadı: %w", err)
	}

	// 🚨 YENİ EKLEME: Auth servisini çağır
	// Bu çağrıyı da Postgres loglama gibi ASENKRON (arka plan) yapmalıyız
	// ki kullanıcıyı bekletmesin.
	go s.callUpdateFirstLogin(context.Background(), input.UserID, authHeader)

	// 4. Bu olayı Postgres'e logla (Asenkron)
	go func() {
		err := s.repo.LogInteractionToDB(context.Background(), input.UserID, "onboarding", "", input)
		if err != nil {
			log.Printf("Hata: Onboarding loglanamadı (Postgres): %v", err)
		}
	}()
	return nil
}

// --- 2. İşlev: Etkileşim İşleme (Refactor Edildi) ---
func (s *ScoreService) ProcessInteraction(ctx context.Context, input *InteractionInput) error {
	// 1. Skoru Redis'ten Getir
	currentScores, err := s.repo.GetUserScoresFromCache(ctx, input.UserID)

	// Kullanıcı Redis'te yoksa (ilk etkileşimi veya cache'i dolmuşsa)
	if err != nil {
		if err == redis.Nil { // Hata kontrolü 'redis.Nil' ile yapılmalı
			log.Printf("Kullanıcı %d Redis'te bulunamadı, varsayılan skorlarla oluşturuluyor...", input.UserID)

			// Varsayılan (tümü 10.0) skorlarla bir 'onboarding' işlemi yap
			onboardingInput := &OnboardingInput{UserID: input.UserID, Categories: []string{}}

			// 🚨 GÜNCELLEME: Onboarding'i çağırırken JWT'nin olmadığını belirtmek için boş string ("") yolla.
			// Bu, ProcessOnboarding içindeki Auth servisi çağrısını ATLAMASINI sağlayacaktır.
			if err := s.ProcessOnboarding(ctx, onboardingInput, ""); err != nil { // 🚨 BURASI DEĞİŞTİ
				return fmt.Errorf("yeni kullanıcı (Redis) oluşturulamadı: %w", err)
			}

			// Skoru tekrar çek
			currentScores, err = s.repo.GetUserScoresFromCache(ctx, input.UserID)
		}
		if err != nil {
			return fmt.Errorf("Redis'ten skor alınamadı: %w", err)
		}
	}

	// 2. Çekirdek "Etkileşim" mantığını (S-Curve) uygula
	if err := s.applyInteractionLogic(currentScores, input); err != nil {
		// Hata (örn: geçersiz kategori adı) varsa logla ama devam et
		log.Printf("Uyarı: Etkileşim mantığı uygulanamadı: %v", err)
		return nil // API'ye hata dönme
	}

	// 3. Güncel Struct'ı Redis'e Geri Yaz
	if err := s.repo.SetScoresInCache(ctx, currentScores); err != nil {
		return fmt.Errorf("Redis'e skor güncellenemedi: %w", err)
	}

	// 4. Bu etkileşimi Postgres'e Logla (Asenkron)
	go func() {
		err := s.repo.LogInteractionToDB(context.Background(), input.UserID, "interaction", input.Category, input)
		if err != nil {
			log.Printf("Hata: Etkileşim loglanamadı (Postgres): %v", err)
		}
	}()
	return nil
}

// --- 3. İşlev: Kurtarma (Recovery) (YENİ) ---

// RebuildAllScores, veritabanındaki TÜM kullanıcılar için skorları yeniden oluşturur.
func (s *ScoreService) RebuildAllScores(ctx context.Context) (int, error) {
	log.Println("--- REDIS SKOR KURTARMA (REBUILD) BAŞLADI ---")

	// 1. Tüm kullanıcı ID'lerini Postgres'ten al
	userIDs, err := s.repo.GetDistinctUserIDs(ctx)
	if err != nil {
		return 0, err
	}

	processedCount := 0
	// 2. Her kullanıcı için 'Rebuild' işlemini çalıştır
	for _, userID := range userIDs {
		err := s.rebuildScoresForUser(ctx, userID) // (Aşağıdaki özel fonksiyon)
		if err != nil {
			log.Printf("Hata: Kullanıcı %d yeniden oluşturulamadı: %v", userID, err)
		} else {
			processedCount++
		}
	}

	log.Printf("--- REDIS KURTARMA BİTTİ. %d/%d kullanıcı işlendi. ---", processedCount, len(userIDs))
	return processedCount, nil
}

// rebuildScoresForUser, bir kullanıcının TÜM geçmişini Postgres'ten okur,
// skorlarını sıfırdan hesaplar ve tek seferde Redis'e yazar.
func (s *ScoreService) rebuildScoresForUser(ctx context.Context, userID int64) error {

	// YENİ EK: En son sıfırlama zamanını al
	// Bu, tüm skorları sıfırlayan sistem olayının zamanıdır.
	lastResetTime, err := s.repo.GetLastResetTime(ctx, userID) // <-- Artık repo'da var
	if err != nil {
		log.Printf("Uyarı: En son sıfırlama zamanı alınamadı, tüm geçmiş hesaplanacak: %v", err)
		// lastResetTime zero time olarak kalır.
	}

	// 1. Kullanıcının tüm geçmişini (sıralı) çek
	// YENİ: Sorguya lastResetTime'ı gönderiyoruz.
	events, err := s.repo.GetInteractionsForUserSince(ctx, userID, lastResetTime) // <-- Artık repo'da var
	if err != nil {
		return fmt.Errorf("kullanıcı (%d) geçmişi okunamadı: %w", userID, err)
	}

	// 2. Etkileşim yoksa kontrol et
	if len(events) == 0 {
		// Eğer sıfırlama olmuş ve o zamandan beri etkileşim yoksa, default skorları uygula.
		if !lastResetTime.IsZero() {
			// Hiç etkileşim yoksa, sadece varsayılan skorları Redis'e yazıp çık.
			defaultScores := &entity.UserScore{UserID: userID}
			s.applyDefaultScoreLogic(defaultScores) // Yeni yardımcı fonksiyon
			return s.repo.SetScoresInCache(ctx, defaultScores)
		}
		return nil // Etkileşimi yoksa, geç
	}

	// 3. Skorları sıfırdan hesaplamak için boş bir struct ile başla
	currentScores := &entity.UserScore{UserID: userID}

	// YENİ EK: Eğer sıfırlama yapıldıysa, başlangıç skorlarını 10.0'dan başlat
	if !lastResetTime.IsZero() {
		// Eğer bir sıfırlama kaydı varsa, hesaplamaya 10.0'dan başla
		s.applyDefaultScoreLogic(currentScores)
	}

	// 4. Etkileşimleri 'Yeniden Oynat' (Replay)
	for _, event := range events {

		if event.EventType == "onboarding" {
			var input OnboardingInput
			if err := json.Unmarshal(event.EventData, &input); err != nil {
				log.Printf("Uyarı: Kullanıcı %d 'onboarding' JSON parse hatası (Rebuild): %v", userID, err)
				continue
			}
			// ÇEKİRDEK MANTIK 1 (Tekrar Kullanım)
			s.applyOnboardingLogic(currentScores, &input)

		} else if event.EventType == "interaction" {
			var input InteractionInput
			if err := json.Unmarshal(event.EventData, &input); err != nil {
				log.Printf("Uyarı: Kullanıcı %d 'interaction' JSON parse hatası (Rebuild): %v", userID, err)
				continue
			}
			// ÇEKİRDEK MANTIK 2 (Tekrar Kullanım)
			s.applyInteractionLogic(currentScores, &input)
		}
	}

	// 5. Hesaplanan son skoru Redis'e yaz
	log.Printf("Kullanıcı %d için skorlar yeniden hesaplandı, Redis'e yazılıyor.", userID)
	return s.repo.SetScoresInCache(ctx, currentScores)
}

// --- 4. PROFESYONEL ÇEKİRDEK MANTIK (ÖZEL YARDIMCILAR) ---

// applyOnboardingLogic, bir skor struct'ını onboarding verisine göre günceller
func (s *ScoreService) applyOnboardingLogic(scores *entity.UserScore, input *OnboardingInput) {
	v := reflect.ValueOf(scores).Elem()
	t := v.Type()
	// 1. Tüm skorları varsayılan (10.0) yap
	for i := 0; i < v.NumField(); i++ {
		if fieldType := t.Field(i).Type; fieldType.Kind() == reflect.Float32 {
			v.Field(i).SetFloat(float64(DefaultStartScore))
		}
	}
	// 2. Seçilenleri (50.0) yap
	for _, categoryName := range input.Categories {
		fieldName := s.formatCategoryToFieldName(categoryName)
		if err := s.setScoreByFieldName(scores, fieldName, OnboardingStartScore); err != nil {
			log.Printf("Uyarı: Geçersiz kategori adı (applyOnboarding): %s", categoryName)
		}
	}
}

// applyInteractionLogic, bir skor struct'ını etkileşim verisine göre günceller
func (s *ScoreService) applyInteractionLogic(scores *entity.UserScore, input *InteractionInput) error {
	// 1. Ağırlığı hesapla
	eventWeight := s.calculateEventWeight(input)
	if eventWeight == 0 {
		return nil // Nötr etkileşim
	}

	// 2. Struct'tan mevcut skoru al
	categoryFieldName := s.formatCategoryToFieldName(input.Category)
	currentScore, err := s.getScoreByFieldName(scores, categoryFieldName)
	if err != nil {
		return fmt.Errorf("geçersiz kategori adı (applyInteraction): %s", input.Category)
	}

	// 3. S-Curve Algoritmasını çalıştır
	var factor float32
	if eventWeight > 0 { // Pozitif (Artış)
		factor = (MaxScore - currentScore) / MaxScore
	} else { // Negatif (Azalış)
		factor = currentScore / MaxScore
	}
	deltaScore := eventWeight * factor * LearningRate
	newScore := currentScore + deltaScore

	// 4. Skoru Sınırla (Clamping)
	if newScore > ScoreClampMax {
		newScore = ScoreClampMax
	}
	if newScore < ScoreClampMin {
		newScore = ScoreClampMin
	}

	// 5. Yeni skoru struct'a geri yaz
	return s.setScoreByFieldName(scores, categoryFieldName, newScore)
}

// calculateEventWeight, JSON'u tek bir ağırlık skoruna çevirir (Değişiklik yok)
func (s *ScoreService) calculateEventWeight(input *InteractionInput) float32 {
	var weight float32 = 0
	if input.Like == "yes" {
		weight += 1.0
	}
	if input.Dislike == "yes" {
		weight -= 1.5
	}
	if input.Share == "yes" {
		weight += 0.8
	}
	if input.ClickDetail == "yes" {
		weight += 0.3
	}
	if input.SecondSpendingTime == 0 && input.FirstSpendingTime < 3 {
		weight -= 0.7
	}
	if input.SecondSpendingTime > 30 {
		weight += 0.5
	}
	return weight
}

// formatCategoryToFieldName, "technology" -> "TechnologyScore" yapar (Değişiklik yok)
func (s *ScoreService) formatCategoryToFieldName(category string) string {
	if category == "" {
		return ""
	}
	return strings.Title(category) + "Score"
}

// getScoreByFieldName, reflection kullanarak skoru okur (Değişiklik yok)
func (s *ScoreService) getScoreByFieldName(scores *entity.UserScore, fieldName string) (float32, error) {
	v := reflect.ValueOf(scores).Elem()
	field := v.FieldByName(fieldName)
	if !field.IsValid() {
		return 0, fmt.Errorf("geçersiz alan adı: %s", fieldName)
	}
	return float32(field.Float()), nil
}

// setScoreByFieldName, reflection kullanarak skoru yazar (Değişiklik yok)
func (s *ScoreService) setScoreByFieldName(scores *entity.UserScore, fieldName string, value float32) error {
	v := reflect.ValueOf(scores).Elem()
	field := v.FieldByName(fieldName)
	if !field.IsValid() {
		return fmt.Errorf("geçersiz alan adı: %s", fieldName)
	}
	if !field.CanSet() {
		return fmt.Errorf("alana değer atanamıyor (unexported?): %s", fieldName)
	}
	field.SetFloat(float64(value))
	return nil
}

// YENİ: GetRankedCategories, skorları alır, sıralar ve kategori listesi döner.
func (s *ScoreService) GetRankedCategories(ctx context.Context, userID int64) ([]rankedCategory, error) {
	// 1. Repodan skorları (map[string]string) olarak al
	rawScores, err := s.repo.GetUserScores(ctx, userID)
	if err != nil {
		return nil, err
	}

	var rankedList []rankedCategory

	// 2. Map'i 'rankedCategory' listesine çevir ve float'a dönüştür
	for key, val := range rawScores {

		if key == "user_id" || key == "id" {
			continue // Bu döngüyü atla
		}
		// Redis'ten gelen 'technology_score' gibi '_score' eklerini temizle
		categoryName := strings.TrimSuffix(key, "_score")

		score, err := strconv.ParseFloat(val, 64)
		if err != nil {
			log.Printf("Uyarı: Geçersiz skor formatı (UserID: %d, Kategori: %s, Değer: %s)", userID, key, val)
			continue
		}

		rankedList = append(rankedList, rankedCategory{Name: categoryName, Score: score})
	}

	// 3. Listeyi puana göre BÜYÜKTEN KÜÇÜĞE doğru sırala
	sort.Slice(rankedList, func(i, j int) bool {
		return rankedList[i].Score > rankedList[j].Score
	})

	// 4. Sadece kategori isimlerinden oluşan bir string listesi döndür
	var categoryNames []string
	for _, item := range rankedList {
		categoryNames = append(categoryNames, item.Name)
	}

	return rankedList, nil
}

// YENİ: Auth servisine ilk girişin tamamlandığını bildiren fonksiyon.
func (s *ScoreService) callUpdateFirstLogin(ctx context.Context, userID int64, authHeader string) {
	// 1. Ayarları al
	authServiceURL := config.Get("AUTH_SERVICE_URL")
	updateURL := authServiceURL + "/api/users/updateFirstLogin"

	// Postman'de gördüğünüz PUT isteğine uygun client oluştur
	client := &http.Client{}

	// JSON body oluştur (PUT isteği genellikle boş olabilir ama gönderelim)
	// UserID'yi path'ten değil, genellikle JWT'den alır (bizim yapımızda)
	// Auth servisinde userID zaten JWT'den alındığı için body boş kalabilir.
	// Ancak PUT isteği olduğu için genellikle boş bir Reader kullanılır.
	req, err := http.NewRequestWithContext(ctx, "PUT", updateURL, nil)
	if err != nil {
		log.Printf("Hata: Auth isteği oluşturulamadı: %v", err)
		return
	}

	// 2. Başlıkları ekle
	// JWT: Kullanıcının kimliğini doğrulayan başlık (Auth'un ilk kontrolü)
	if authHeader != "" {
		req.Header.Add("Authorization", authHeader) // 🚨 JWT EKLENDİ
	} else {
		// Bu normalde olmamalı, handler'da yakalanmalı
		log.Printf("KRİTİK HATA: Kullanıcı %d için JWT bulunamadı. Auth servisi başarısız olabilir.", userID)
	}

	// X-API-Key: Servisler arası iletişim anahtarı (Auth'un ikinci kontrolü)
	// Bu, isteğin güvenilir bir servisten geldiğini kanıtlar.
	req.Header.Add("X-API-Key", config.Get("TRUSTED_API_KEY")) // 🚨 SERVİS ANAHTARI EKLENDİ

	// 3. İsteği gönder
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("KRİTİK HATA: Auth servisine ('updateFirstLogin') ulaşılamadı: %v", err)
		return
	}
	defer resp.Body.Close()

	// 4. Durum kodunu kontrol et
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Hata: Auth servisi 'updateFirstLogin' başarısız oldu. Durum: %d, Yanıt: %s", resp.StatusCode, string(body))
		return
	}

	log.Printf("✅ Kullanıcı %d için 'updateFirstLogin' başarıyla çağrıldı.", userID)
}

// score_service.go (En alttaki yardımcı fonksiyonlara ekleyin)
// applyDefaultScoreLogic, bir skor struct'ındaki tüm kategori skorlarını
// DefaultStartScore (10.0) değerine çeker.
func (s *ScoreService) applyDefaultScoreLogic(scores *entity.UserScore) {
	v := reflect.ValueOf(scores).Elem()
	t := v.Type()
	// 1. Tüm skorları varsayılan (10.0) yap
	for i := 0; i < v.NumField(); i++ {
		// Yalnızca float32 tipindeki alanları güncelle
		if fieldType := t.Field(i).Type; fieldType.Kind() == reflect.Float32 {
			v.Field(i).SetFloat(float64(DefaultStartScore))
		}
	}
}

// --- YENİ İŞLEV: Belirli Kullanıcı Skorunu Sıfırlama ---

// ResetUserScoresToDefault, sadece belirtilen kullanıcının Redis skorlarını 10.0'a sıfırlar
// ve bu işlemi loglar.
func (s *ScoreService) ResetUserScoresToDefault(ctx context.Context, userID int64) error {
	log.Printf("Kullanıcı %d skorları sıfırlanıyor...", userID)

	// 1. Sıfırlama olayını Postgres'e logla (Bu kullanıcıya ait olarak)
	err := s.repo.LogUserResetEvent(ctx, userID) // <-- Yeni repo fonksiyonu
	if err != nil {
		// Loglayamazsak işlemi durdurmak daha güvenli olabilir
		return fmt.Errorf("kullanıcı %d sıfırlama olayı loglanamadı: %w", userID, err)
	}

	// 2. Geçici skor struct'ı oluştur
	defaultScores := &entity.UserScore{UserID: userID}

	// 3. ÇEKİRDEK MANTIK: Tüm skorları 10.0 yap
	s.applyDefaultScoreLogic(defaultScores) // Mevcut yardımcı fonksiyon

	// 4. Redis'e yaz
	if err := s.repo.SetScoresInCache(ctx, defaultScores); err != nil {
		return fmt.Errorf("kullanıcı %d skoru Redis'e sıfırlanamadı: %w", userID, err)
	}

	return nil
}

// applyDefaultScoreLogic ve rebuildScoresForUser fonksiyonları değişmedi.
