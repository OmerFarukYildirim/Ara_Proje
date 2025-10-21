package com.FetcherMicroService.services;

import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class NewsService {

    private final WebClient webClient;

    @Value("${newsapi.key}")
    private String apiKey;

    // WebClient'ı constructor injection ile alıyoruz
    public NewsService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<NewsResponseDTO> getNewsByCategory(String category) {
        // WebClient ile asenkron ve bloklamayan GET isteği atıyoruz
        return this.webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/top-headlines") // base-url'e eklenecek yol
                        //.queryParam("country", "tr")
                        .queryParam("category", category)
                        .queryParam("apiKey", apiKey)
                        .build())
                .retrieve() // İsteği çalıştır ve cevabı almaya başla
                .bodyToMono(NewsResponseDTO.class); // Gelen cevabın body'sini NewsResponseDTO nesnesine dönüştür
    }
}
