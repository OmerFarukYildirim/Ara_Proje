package com.SourceManagerMicroService.controller;

import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final RedisTemplate<String, NewsResponseDTO> redisTemplate;

    public NewsController(RedisTemplate<String, NewsResponseDTO> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping
    public ResponseEntity<NewsResponseDTO> getNews(@RequestParam String category) {

        String cacheKey = "news:" + category;

        // 1. Redis'ten veriyi oku
        NewsResponseDTO cachedNews = redisTemplate.opsForValue().get(cacheKey);

        if (cachedNews != null) {
            // 2. Cache'de varsa, anında döndür (En hızlı senaryo)
            return ResponseEntity.ok(cachedNews);
        } else {
            // 3. Cache'de yoksa (Scheduler daha çalışmamışsa veya kategori desteklenmiyorsa)
            // Kullanıcıya boş bir cevap veya hata döndür.
            // Asla bu endpoint'ten fetcher'ı çağırma!
            return ResponseEntity.status(404)
                    .body(null); // Veya özel bir hata DTO'su dönebilirsin
        }
    }
}
