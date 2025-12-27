package com.FetcherMicroService.schedulers;

import org.springframework.kafka.core.KafkaTemplate; // 💡 NewsService yerine KafkaTemplate
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class NewsScheduler {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    // İsteklerin atılacağı topic (Dinleyen consumer bu topic'e abone olmalı)
    private static final String REQUEST_TOPIC = "haber_talebi_topic";

    private static final List<String> CATEGORIES = Arrays.asList(
            "science", "sports", "technology", "travel", "health",
            "economy", "fashion", "game", "music", "book",
            "nature", "education", "movie", "photography", "food", "art"
    );

    private static final int COUNT_PER_CATEGORY = 2;

    public NewsScheduler(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /*@Scheduled(cron = "0 0 * * * *") // Her saat başı
    public void generateNewsByCategories() {
        System.out.println(">>> SCHEDULER TETİKLENDİ: Tüm kategoriler için Kafka'ya talep bırakılıyor...");

        // Sadece Kafka'ya mesaj atıyoruz. Hızlı ve güvenli.
        CATEGORIES.forEach(category -> {
            KafkaCategoryRequest request = new KafkaCategoryRequest(category, COUNT_PER_CATEGORY);

            this.kafkaTemplate.send(REQUEST_TOPIC, request);
            System.out.println("   -> Talep Kuyruğa Atıldı: " + category);
        });

        System.out.println(">>> SCHEDULER BİTTİ (Talepler Kafka'ya iletildi, gerisi Consumer'da).");
    }*/
}
