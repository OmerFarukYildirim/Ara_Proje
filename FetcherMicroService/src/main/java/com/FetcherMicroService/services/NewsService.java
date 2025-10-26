package com.FetcherMicroService.services; // Senin paket adın farklı olabilir

import com.FetcherMicroService.dtos.ArticleDTO;
import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map; // Python'dan gelen JSON'u karşılamak için Map kullanabiliriz

@Service
public class NewsService {

    private final WebClient newsApiWebClient;
    private final WebClient pipelineWebClient; // Adını değiştirdik
    private final String newsApiKey;

    public NewsService(WebClient.Builder webClientBuilder,
                       @Value("${newsapi.key}") String newsApiKey,
                       @Value("${pipeline.start.url}") String pipelineStartUrl) { // Değişti

        this.newsApiWebClient = webClientBuilder
                .baseUrl("https://newsapi.org/v2")
                .build();
        this.newsApiKey = newsApiKey;

        // Artık :8001'deki content-finder'a bağlanıyoruz
        this.pipelineWebClient = webClientBuilder
                .baseUrl(pipelineStartUrl) // http://127.0.0.1:8001
                .build();
    }

    public Mono<Map> fetchAndEnrichNews(String category) {

        // ADIM 1: NewsAPI'den haberleri çek (Bu kısım aynı)
        Mono<NewsResponseDTO> newsApiMono = this.newsApiWebClient.get()
                // ... (uri oluşturma kısmı aynı, .queryParam("country", "tr") YORUMDA KALSIN)
                .uri(uriBuilder -> uriBuilder
                        .path("/top-headlines")
                        .queryParam("apiKey", this.newsApiKey)
                        //.queryParam("country", "tr")
                        .queryParam("category", category)
                        .build())
                .retrieve()
                .bodyToMono(NewsResponseDTO.class)
                .doOnError(error -> System.err.println("NewsAPI Hatası: ".concat(error.getMessage())));

        // ADIM 2: Gelen haberleri YENİ PİPELINE'A (Content-Finder'a) yolla
        return newsApiMono
                .flatMap(newsResponse -> {
                    List<ArticleDTO> articles = newsResponse.getArticles();

                    if (articles == null || articles.isEmpty()) {
                        // ... (Bu kısım aynı)
                        return Mono.just(Map.of("message", "NewsAPI'den haber bulunamadı.", "saved_count", 0));
                    }

                    System.out.println(articles.size() + " adet haber NewsAPI'den çekildi. Content-Finder servisine yollanıyor...");

                    // Python servisimizin /scrape-and-forward endpoint'ine POST at
                    return this.pipelineWebClient.post()
                            .uri("/scrape-and-forward") // Değişti
                            .bodyValue(articles)
                            .retrieve()
                            .bodyToMono(Map.class); // Gelen JSON'u ({"saved_count": ...}) Map'e çevir
                })
                .doOnError(error -> System.err.println("Pipeline Servisine bağlanırken Hata: " + error.getMessage()));
    }
}