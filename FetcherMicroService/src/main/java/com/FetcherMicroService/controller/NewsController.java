package com.FetcherMicroService.controller; // Senin paket adın farklı olabilir

import com.FetcherMicroService.services.NewsService;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    // Dönüş tipini Mono<Map> olarak güncelledik
    @GetMapping
    public Mono<Map> getNews(@RequestParam String category) {
        // fetchAndEnrichNews metodunu çağırıyoruz
        return newsService.fetchAndEnrichNews(category);
    }
}