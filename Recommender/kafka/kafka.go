package kafka

import (
	"context"
	"encoding/json"
	"fmt" // Hata mesajı için eklendi
	"log"
	"recommender/config"
	"recommender/service"
	"time"

	"github.com/segmentio/kafka-go"
)

// --- 1. PRODUCER (YAYINCI) KISMI (GÜNCELLENDİ) ---

// Producer, artık iki topic için iki ayrı 'Writer' tutar.
// Bu, 'kafka.Conn' kullanmaktan daha temiz ve tavsiye edilen yöntemdir.
type Producer struct {
	onboardingWriter  *kafka.Writer
	interactionWriter *kafka.Writer
}

// InitProducer, Kafka'ya bağlanır ve topic başına bir 'Writer' oluşturur.
func InitProducer() *Producer {
	brokers := []string{config.Get("KAFKA_BROKERS")}
	topicOnboarding := config.Get("KAFKA_TOPIC_ONBOARDING")
	topicInteraction := config.Get("KAFKA_TOPIC_INTERACTION")

	// Onboarding topic'i için bir Writer oluştur
	writerOnboarding := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topicOnboarding,     // Bu Writer'ın HANGİ topic'e yazacağını belirt
		Balancer: &kafka.LeastBytes{}, // Mesajları partisyonlara dağıtma stratejisi
	}

	// Interaction topic'i için bir Writer oluştur
	writerInteraction := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topicInteraction, // Bu Writer'ın HANGİ topic'e yazacağını belirt
		Balancer: &kafka.LeastBytes{},
	}

	log.Println("Kafka Producer (Yayıncı) 'Writer'ları başarıyla oluşturdu.")

	return &Producer{
		onboardingWriter:  writerOnboarding,
		interactionWriter: writerInteraction,
	}
}

// Publish, mesajı doğru 'Writer'a yönlendirir.
func (p *Producer) Publish(topic string, message []byte) error {
	var writer *kafka.Writer

	// Hangi topic (kuyruk) olduğuna bak
	if topic == config.Get("KAFKA_TOPIC_ONBOARDING") {
		writer = p.onboardingWriter
	} else if topic == config.Get("KAFKA_TOPIC_INTERACTION") {
		writer = p.interactionWriter
	} else {
		return fmt.Errorf("bilinmeyen Kafka topic: %s", topic)
	}

	// Mesajı yolla (Context.Background() kullanarak)
	// ÖNEMLİ: 'Writer' zaten topic'i bildiği için,
	// 'kafka.Message' struct'ına 'Topic' YAZMIYORUZ.
	// Hatayı veren şey buydu.
	err := writer.WriteMessages(context.Background(),
		kafka.Message{
			Value: message,
			// Key: (Opsiyonel, user_id'ye göre sıralamak istersen eklenebilir)
		},
	)

	if err != nil {
		log.Printf("Hata: Kafka'ya mesaj yazılamadı (Topic: %s): %v", topic, err)
	}
	return err
}

// Close, tüm Writer bağlantılarını düzgünce kapatır.
func (p *Producer) Close() {
	log.Println("Kafka Producer (Yayıncı) kapatılıyor...")
	if p.onboardingWriter != nil {
		p.onboardingWriter.Close()
	}
	if p.interactionWriter != nil {
		p.interactionWriter.Close()
	}
}

// --- 2. CONSUMER (TÜKETİCİ) KISMI (DEĞİŞİKLİK YOK) ---

// Consumer, Kafka'yı dinler ve 'service' katmanını tetikler.
type Consumer struct {
	reader  *kafka.Reader
	service *service.ScoreService
}

// NewConsumer, iki topic'i de (onboarding ve interaction) dinleyecek
// bir 'Consumer' (Tüketici) grubu oluşturur.
func NewConsumer(svc *service.ScoreService) *Consumer {
	brokers := []string{config.Get("KAFKA_BROKERS")}
	topicOnboarding := config.Get("KAFKA_TOPIC_ONBOARDING")
	topicInteraction := config.Get("KAFKA_TOPIC_INTERACTION")

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		GroupID:        "recommender-service-group",
		GroupTopics:    []string{topicOnboarding, topicInteraction},
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		CommitInterval: time.Second,
	})
	log.Println("Kafka Consumer (Tüketici) dinlemeye hazır.")
	return &Consumer{reader: r, service: svc}
}

// Start, Kafka'yı dinlemek için sonsuz bir döngü başlatır.
func (c *Consumer) Start(ctx context.Context) {
	log.Println("Kafka Consumer (Tüketici) başlatıldı, mesajlar bekleniyor...")
	topicOnboarding := config.Get("KAFKA_TOPIC_ONBOARDING")
	topicInteraction := config.Get("KAFKA_TOPIC_INTERACTION")

	for {
		m, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if err == context.Canceled {
				log.Println("Kafka Consumer (Tüketici) durduruldu.")
			} else {
				log.Printf("Kafka okuma hatası: %v", err)
			}
			break // Döngüyü kır
		}

		log.Printf("Kafka'dan mesaj alındı (Topic: %s, Partition: %d, Offset: %d)", m.Topic, m.Partition, m.Offset)

		switch m.Topic {
		case topicOnboarding:
			c.handleOnboarding(ctx, m.Value)
		case topicInteraction:
			c.handleInteraction(ctx, m.Value)
		}
	}
}

// handleOnboarding, 'onboarding' mesajını JSON'dan çözer ve 'service' katmanına iletir.
func (c *Consumer) handleOnboarding(ctx context.Context, data []byte) {
	var input service.OnboardingInput
	if err := json.Unmarshal(data, &input); err != nil {
		log.Printf("Hata: 'onboarding' JSON parse edilemedi: %v (Veri: %s)", err, string(data))
		return
	}
    
    // 🚨 GÜNCELLEME: AuthHeader'ı struct'tan al ve ProcessOnboarding'e yolla
    authHeader := input.AuthHeader
    
    // ProcessOnboarding artık 3 argüman bekliyor.
	if err := c.service.ProcessOnboarding(ctx, &input, authHeader); err != nil {
		log.Printf("Hata: 'onboarding' işlenemedi (UserID: %d): %v", input.UserID, err)
	} else {
		log.Printf("Başarılı: 'onboarding' işlendi (UserID: %d)", input.UserID)
	}
}

// handleInteraction, 'interaction' mesajını işler.
func (c *Consumer) handleInteraction(ctx context.Context, data []byte) {
	var input service.InteractionInput
	if err := json.Unmarshal(data, &input); err != nil {
		log.Printf("Hata: 'interaction' JSON parse edilemedi: %v (Veri: %s)", err, string(data))
		return
	}
	if err := c.service.ProcessInteraction(ctx, &input); err != nil {
		log.Printf("Hata: 'interaction' işlenemedi (UserID: %d, Category: %s): %v", input.UserID, input.Category, err)
	} else {
		log.Printf("Başarılı: 'interaction' işlendi (UserID: %d, Category: %s)", input.UserID, input.Category)
	}
}

// Close, Consumer bağlantısını düzgünce kapatır.
func (c *Consumer) Close() {
	if c.reader != nil {
		log.Println("Kafka Consumer (Tüketici) kapatılıyor...")
		c.reader.Close()
	}
}
