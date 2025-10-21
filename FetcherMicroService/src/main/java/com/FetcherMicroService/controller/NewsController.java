package com.FetcherMicroService.controller;

import com.FetcherMicroService.dtos.NewsResponseDTO;
import com.FetcherMicroService.services.NewsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public Mono<NewsResponseDTO> getNews(@RequestParam String category) {
        // Servisten Mono<NewsResponseDTO> nesnesini direkt olarak geri döndürüyoruz.
        // Spring WebFlux gerisini halleder. Asla .block() kullanma!
        return newsService.getNewsByCategory(category);
    }
}
