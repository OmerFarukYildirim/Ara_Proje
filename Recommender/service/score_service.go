package service

import (
	"context"
	"fmt"
	"log"
	"recommender/entity"
	"recommender/repository" // Az önce yazdığımız katman
	"reflect"                // Struct'taki alanı isme göre bulmak için
	"strings"
)

// --- Skorlama Ayarları ---
const (
	MaxScore             float32 = 100.0 // Üst sınır
	MinScore             float32 = 0.0   // Alt sınır
	LearningRate         float32 = 5.0   // Öğrenme hızı (Algoritma ne kadar keskin?)
	DefaultStartScore    float32 = 10.0  // Seçilmeyen kategorilerin başlangıç skoru
	OnboardingStartScore float32 = 50.0  // Kullanıcının SEÇTİĞİ kategorilerin skoru
	ScoreClampMin        float32 = 0.1   // Asla 0'a ulaşmasın
	ScoreClampMax        float32 = 99.9  // Asla 100'e ulaşmasın
)

// Frontend'den gelen etkileşim JSON'u
type InteractionInput struct {
	UserID             int64
	NewsID             string  `json:"news_id"`
	Category           string  `json:"category"` // "technology", "sports" vs.
	Like               string  `json:"like"`     // "yes" or "no"
	Dislike            string  `json:"dislike"`  // "yes" or "no"
	FirstSpendingTime  float32 `json:"first_spending_time"`
	ClickDetail        string  `json:"click_detail"` // "yes" or "no"
	SecondSpendingTime float32 `json:"second_spending_time"`
	Share              string  `json:"share"` // "yes" or "no"
}

// Frontend'den gelen "Başlangıç Seçimi" JSON'u
type OnboardingInput struct {
	UserID     int64
	Categories []string `json:"categories"` // ["technology", "sports", ...]
}

// ScoreService, iş mantığını içerir
type ScoreService struct {
	repo *repository.ScoreRepository
}

// NewScoreService, Repository'yi enjekte ederek servisi oluşturur
func NewScoreService(r *repository.ScoreRepository) *ScoreService {
	return &ScoreService{repo: r}
}

// --- 1. İşlev: Başlangıç Seçimi (Onboarding) ---
func (s *ScoreService) ProcessOnboarding(ctx context.Context, input *OnboardingInput) error {
	// Yeni kullanıcı için boş bir skor struct'ı oluştur
	newUserScore := entity.UserScore{
		UserID: input.UserID,
	}

	// Go'da 'reflection' kullanarak tüm skorları varsayılan (10.0) ile doldur
	v := reflect.ValueOf(&newUserScore).Elem()
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		// Sadece float32 (skor) alanlarını doldur
		if fieldType := t.Field(i).Type; fieldType.Kind() == reflect.Float32 {
			v.Field(i).SetFloat(float64(DefaultStartScore))
		}
	}

	// Şimdi, kullanıcının SEÇTİĞİ kategorileri 50.0 yap
	for _, categoryName := range input.Categories {

		// --- DÜZELTME BURADA ---
		// "technology" -> "TechnologyScore" dönüşümünü yap
		fieldName := s.formatCategoryToFieldName(categoryName)
		// --- BİTTİ ---

		err := s.setScoreByFieldName(&newUserScore, fieldName, OnboardingStartScore) // Artık fieldName'i kullan
		if err != nil {
			// Hata (örn: "technolojy" gibi yanlış yazım gelirse)
			log.Printf("Uyarı: Geçersiz kategori adı (onboarding): %s (Çevrilen: %s)", categoryName, fieldName)
		}
	}

	// Doldurulmuş bu yeni struct'ı veritabanına kaydet/güncelle
	return s.repo.UpsertUserScores(ctx, &newUserScore)
}

// --- 2. İşlev: Etkileşim İşleme (Ana Algoritma) ---
func (s *ScoreService) ProcessInteraction(ctx context.Context, input *InteractionInput) error {
	// 1. Etkileşim Ağırlığını (EventWeight) Hesapla
	eventWeight := s.calculateEventWeight(input)
	if eventWeight == 0 {
		return nil // Nötr etkileşim, skoru değiştirme
	}

	// 2. Kullanıcının MEVCUT Skorlarını Veritabanından Getir
	currentScores, err := s.repo.GetUserScores(ctx, input.UserID)
	if err != nil {
		return fmt.Errorf("mevcut skorlar alınamadı: %w", err)
	}

	// Kullanıcı bulunamadıysa (ilk etkileşimi olabilir), onu 'onboarding' olmuş gibi yarat
	if currentScores == nil {
		log.Printf("Kullanıcı %d bulunamadı, varsayılan skorlarla oluşturuluyor...", input.UserID)
		// Boş kategori listesiyle 'onboarding' yap (tüm skorlar 10.0 başlar)
		onboardingInput := &OnboardingInput{UserID: input.UserID, Categories: []string{}}
		if err := s.ProcessOnboarding(ctx, onboardingInput); err != nil {
			return fmt.Errorf("yeni kullanıcı oluşturulamadı: %w", err)
		}
		// Tekrar çek
		currentScores, err = s.repo.GetUserScores(ctx, input.UserID)
		if err != nil {
			return fmt.Errorf("yeni kullanıcı skorları alınamadı: %w", err)
		}
	}

	// 3. S-Curve Algoritmasını Uygula

	// Haberin kategorisi için (örn: "technology") mevcut skoru al
	categoryFieldName := s.formatCategoryToFieldName(input.Category) // "technology" -> "TechnologyScore"
	currentScore, err := s.getScoreByFieldName(currentScores, categoryFieldName)
	if err != nil {
		return fmt.Errorf("geçersiz kategori adı (interaction): %s", input.Category)
	}

	// ÇEKİRDEK ALGORİTMA
	var factor float32
	if eventWeight > 0 {
		// POZİTİF (ARTIRMA) -> Büyüme payına (headroom) bak
		factor = (MaxScore - currentScore) / MaxScore
	} else {
		// NEGATİF (AZALTMA) -> Kayıp payına (decay) bak
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

	// 5. Yeni Skoru Struct'a (ve sonra DB'ye) Kaydet
	s.setScoreByFieldName(currentScores, categoryFieldName, newScore)

	// Güncellenmiş 'currentScores' struct'ının tamamını veritabanına geri yaz
	return s.repo.UpsertUserScores(ctx, currentScores)
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
}
