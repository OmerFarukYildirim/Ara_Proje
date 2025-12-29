package com.FetcherMicroService.services;

import com.FetcherMicroService.dtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

@Service
public class NewsService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String processedTopicName;
    private final WebClient llmWebClient;
    private final String llmApiKey;
    private final ObjectMapper objectMapper;

    public NewsService(
            KafkaTemplate<String, Object> kafkaTemplate,
            WebClient.Builder webClientBuilder,
            @Value("${kafka.topic.news.processed}") String processedTopicName,
            @Value("${llm.api.baseurl}") String llmBaseUrl,
            @Value("${llm.api.key}") String llmApiKey
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.processedTopicName = processedTopicName;
        this.llmWebClient = webClientBuilder.baseUrl(llmBaseUrl).build();
        this.llmApiKey = llmApiKey;
        this.objectMapper = new ObjectMapper();
    }

    // HTML İndirme (Reactive)
    // NewsService.java içindeki downloadHtml metodunu bununla değiştir:

    private Mono<String> downloadHtml(String url) {
        return WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024)) // 16MB buffer (Büyük sayfalar için)
                .build()
                .get()
                .uri(url)
                // --- KRİTİK HEADER AYARLARI ---
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9,tr;q=0.8")
                .header("Referer", "https://www.google.com/") // Google'dan gelmiş gibi yap
                .header("Upgrade-Insecure-Requests", "1")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorResume(e -> {
                    // Hata detayını daha net görelim
                    System.err.println(">>> HTML İNDİRİLEMEDİ (" + url + "): " + e.getMessage());
                    // 403 veya 404 alırsak akışı bozma, boş dön.
                    return Mono.empty();
                });
    }

    // LLM Prompt Oluşturma
    private String createLlmPrompt(String htmlContent, String imageUrl, String category, String url) {
        String safeUrl = url != null ? url : "";
        String safeImage = imageUrl != null ? imageUrl : "";

        // String.format yerine Java 15+ text blocks ile daha temiz concatenation yapılabilir ama
        // güvenli olması için String.format kullanmaya devam edelim.
        // %s karakterlerinin HTML içinde çakışmaması için basit bir replace yapabiliriz.
        // Ancak Gemini güçlü olduğu için formatı genellikle anlar.

        return String.format("""
            Aşağıdaki HTML içeriğini bir haber sitesinden çektim. Bu HTML'i analiz et ve içeriği çıkart.
            
            HEDEF KATEGORİ: '%s'
            HABER URL: '%s' (Bunu JSON'daki 'url' alanına koy)
            RESİM URL: '%s' (Bunu JSON'daki 'image_url' alanına koy)

            Senden istediğim çıktı formatı TAM OLARAK aşağıdaki JSON yapısıdır.
            Başka hiçbir açıklama yapma. Sadece JSON.

            HTML İÇERİĞİ:
            %s

            ***JSON FORMATI:***
            ```json
            {
              "status": "ok",
              "totalResults": 1,
              "articles": [
                {
                  "title": "Haber Başlığı",
                  "description": "Kısa özet",
                  "content": "Detaylı içerik",
                  "url": "%s",
                  "image_url": "%s",
                  "category": "%s"
                }
              ]
            }
            ```
            """, category, safeUrl, safeImage, htmlContent, safeUrl, safeImage, category);
    }

    // ANA METOT: fetchAndProcessNews
    public Mono<Void> fetchAndProcessNews(NewsScrapingRequestDTO request) {
        String targetUrl = request.getUrl();
        String imageUrl = request.getImageUrl();
        String category = request.getTargetCategory();

        System.out.println(">>> İşlem Başlıyor. URL: " + targetUrl);

        // Adım 1: HTML İndir
        return downloadHtml(targetUrl)
                .flatMap(htmlContent -> {
                    if (htmlContent == null || htmlContent.isEmpty()) {
                        System.err.println("Boş HTML içeriği, atlanıyor: " + targetUrl);
                        return Mono.empty();
                    }

                    // Adım 2: Prompt Oluştur
                    String prompt = createLlmPrompt(htmlContent, imageUrl, category, targetUrl);

                    // Adım 3: LLM'e Gönder
                    GeminiRequest llmRequest = new GeminiRequest(
                            List.of(new GeminiContent(List.of(new GeminiPart(prompt))))
                    );

                    return this.llmWebClient.post()
                            .uri(uriBuilder -> uriBuilder
                                    .path("/v1beta/models/gemini-2.0-flash:generateContent")
                                    .queryParam("key", this.llmApiKey)
                                    .build())
                            .bodyValue(llmRequest)
                            .retrieve()
                            .bodyToMono(GeminiResponse.class);
                })
                .flatMap(geminiResponse -> {
                    // Adım 4: Yanıtı Parse Et ve Kafka'ya Bas
                    String jsonText = geminiResponse.getGeneratedText();
                    if (jsonText == null) return Mono.error(new RuntimeException("LLM boş döndü"));

                    try {
                        jsonText = jsonText.replace("```json", "").replace("```", "").trim();

                        NewsResponseDTO newsResponse = objectMapper.readValue(jsonText, NewsResponseDTO.class);

                        if (newsResponse.getArticles() != null) {
                            newsResponse.getArticles().forEach(article -> {

                                // --- YENİ EKLENEN FİLTRELEME MANTIĞI ---
                                // Eğer LLM içerik bulamazsa prompttaki örnekleri ("Haber Başlığı", "Detaylı içerik") dönebilir.
                                // Veya başlık boş gelebilir. Bunları eliyoruz.
                                if (article.getTitle() == null ||
                                        article.getTitle().isEmpty() ||
                                        "Haber Başlığı".equalsIgnoreCase(article.getTitle()) ||
                                        "Detaylı içerik".equalsIgnoreCase(article.getContent()) ||
                                        "Kısa özet".equalsIgnoreCase(article.getDescription())) {

                                    System.err.println(">>> [İPTAL] Kalitesiz/Placeholder içerik. Kafka'ya gönderilmiyor. URL: " + targetUrl);
                                    return; // Bu haberi atla, döngüdeki sıradakine geç
                                }
                                // ---------------------------------------

                                article.setCategory(category); // Kategoriyi garantiye al

                                // Orijinal resim URL'ini koru (LLM bazen değiştirebilir veya boş bırakabilir)
                                if (article.getImage_url() == null || article.getImage_url().isEmpty() || article.getImage_url().equals("null")) {
                                    article.setImage_url(imageUrl);
                                }

                                this.kafkaTemplate.send(this.processedTopicName, article);
                                System.out.println(">>> [BAŞARILI] Kafka'ya atıldı: " + article.getTitle());
                            });
                        }
                    } catch (Exception e) {
                        System.err.println("JSON Parse Hatası (" + targetUrl + "): " + e.getMessage());
                        // Hata olsa bile Mono.empty dönerek akışı kırmıyoruz
                    }
                    return Mono.empty();
                });
    }
}