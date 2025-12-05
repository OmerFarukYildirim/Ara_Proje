package com.FetcherMicroService.kafka;

import com.FetcherMicroService.dtos.KafkaCategoryRequest;
import com.FetcherMicroService.services.NewsService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {

    private final NewsService newsService;

    public KafkaConsumerService(NewsService newsService) {
        this.newsService = newsService;
    }

    // Bu metot, 'haber_talebi_topic' topic'ini dinler
    @KafkaListener(
            topics = "${kafka.topic.news.request}",
            groupId = "${spring.kafka.consumer.group-id}",
            // Gelen JSON'u KafkaCategoryRequest DTO'suna çevir
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void listenToNewsRequests(KafkaCategoryRequest request) {
        String category = request.getCategory();
        int count = request.getCount();
        System.out.println("---------------------------------------------------------");
        System.out.println("Kafka'dan (haber_talebi_topic) istek alındı: " + category + "Sayı: " + count);

        if (category == null || category.isEmpty()) {
            System.err.println("Geçersiz kategori alındı.");
            return;
        }

        // İşi 'NewsService'e pasla (Bu asenkron çalışır)
        newsService.fetchAndProcessNews(request)
                .doOnSuccess(v -> System.out.println("Haberler işlendi ve Kafka'ya " + count + "tane haber (haber_zenginlestirme_topic) yollandı: " + category))
                .doOnError(e -> System.err.println("Haber işlenirken hata oluştu: " + e.getMessage()))
                .subscribe(); // WebFlux (Mono) akışını tetikle
    }
}
