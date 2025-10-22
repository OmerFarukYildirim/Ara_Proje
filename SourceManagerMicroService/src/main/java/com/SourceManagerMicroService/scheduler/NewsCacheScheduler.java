package com.SourceManagerMicroService.scheduler;

import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class NewsCacheScheduler {

    private static final Logger log = LoggerFactory.getLogger(NewsCacheScheduler.class);

    // Redis ve WebClient'ı enjekte et
    private final RedisTemplate<String, NewsResponseDTO> redisTemplate;
    private final WebClient fetcherWebClient;

    // Desteklenen kategorileri burada listeleyelim
    private final List<String> categories = List.of("technology", "sports", "health", "business", "science");

    public NewsCacheScheduler(RedisTemplate<String, NewsResponseDTO> redisTemplate, WebClient fetcherWebClient) {
        this.redisTemplate = redisTemplate;
        this.fetcherWebClient = fetcherWebClient;
    }

    // her 5 dakikada bir çalış (300000 milisaniye)
    @Scheduled(initialDelay = 10000, fixedRate = 300000)
    public void cacheAllNewsCategories() {
        log.info("Zamanlanmış görev başladı: Haber önbelleği güncelleniyor...");

        for (String category : categories) {
            log.info("'{}' kategorisi çekiliyor...", category);

            // fetcher-service'i asenkron çağır
            fetcherWebClient.get()
                    .uri("/api/news?category=" + category) // fetcher'ın endpoint'i
                    .retrieve()
                    .bodyToMono(NewsResponseDTO.class)
                    .subscribe(
                            // Başarılı olursa (onNext):
                            newsResponse -> {
                                // Redis'e yaz
                                String cacheKey = "news:" + category;
                                redisTemplate.opsForValue().set(cacheKey, newsResponse);

                                // (Opsiyonel) Cache'e bir ömür verelim, örn: 10 dakika
                                redisTemplate.expire(cacheKey, 10, TimeUnit.MINUTES);

                                log.info("'{}' kategorisi başarıyla cache'lendi. Bulunan haber: {}", category, newsResponse.getTotalResults());
                            },
                            // Hata olursa (onError):
                            error -> {
                                log.error("'{}' kategorisi çekilirken hata oluştu: {}", category, error.getMessage());
                            }
                    );
        }
    }
}
