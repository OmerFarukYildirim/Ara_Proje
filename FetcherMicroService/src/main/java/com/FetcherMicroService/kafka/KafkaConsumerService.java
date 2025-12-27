package com.FetcherMicroService.kafka;

import com.FetcherMicroService.dtos.NewsScrapingRequestDTO; // YENİ DTO'yu import et
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
            // Gelen JSON'u ARTIK 'NewsScrapingRequestDTO'ya çeviriyoruz
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void listenToNewsRequests(NewsScrapingRequestDTO request) {
        // Gelen isteğin içeriğini loglayalım
        String url = request.getUrl();
        String category = request.getTargetCategory();

        System.out.println("---------------------------------------------------------");
        System.out.println("Kafka'dan URL isteği alındı. Kategori: " + category + " | URL: " + url);

        if (url == null || url.isEmpty()) {
            System.err.println("HATA: Boş URL alındı, işlem iptal.");
            return;
        }

        // İşi 'NewsService'e pasla (Bu asenkron çalışır)
        newsService.fetchAndProcessNews(request)
                .doOnSuccess(v -> System.out.println(">>> İşlem Tamamlandı: " + url))
                .doOnError(e -> System.err.println(">>> HATA: Haber işlenemedi (" + url + "): " + e.getMessage()))
                .subscribe(); // WebFlux (Mono) akışını tetikle
    }
}