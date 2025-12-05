package com.FetcherMicroService.services;

import com.FetcherMicroService.dtos.*;
import com.fasterxml.jackson.databind.ObjectMapper; // YENİ
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient; // YENİ
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class NewsService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String processedTopicName;
    private final WebClient llmWebClient; // YENİ
    private final String llmApiKey; // YENİ
    private final ObjectMapper objectMapper; // YENİ

    public NewsService(
            KafkaTemplate<String, Object> kafkaTemplate,
            WebClient.Builder webClientBuilder, // YENİ
            @Value("${kafka.topic.news.processed}") String processedTopicName,
            @Value("${llm.api.baseurl}") String llmBaseUrl, // YENİ
            @Value("${llm.api.key}") String llmApiKey // YENİ
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.processedTopicName = processedTopicName;
        this.llmWebClient = webClientBuilder.baseUrl(llmBaseUrl).build(); // YENİ
        this.llmApiKey = llmApiKey; // YENİ
        this.objectMapper = new ObjectMapper(); // YENİ
    }

    // --- BU METOT ARTIK GERÇEK BİR LLM ÇAĞRISI YAPIYOR ---
    private Mono<NewsResponseDTO> fetchFromLlm(String requestCategory, int count) {
        System.out.println(">>> Gerçek LLM'e istek hazırlanıyor. Kategori: " + requestCategory + ", Sayı: " + count);

        // 1. LLM için Prompt Hazırla
        String prompt = createLlmPrompt(requestCategory, count);

        // 2. Gemini İstek (Request) Body'sini Oluştur
        GeminiRequest llmRequest = new GeminiRequest(
                List.of(new GeminiContent(List.of(new GeminiPart(prompt))))
        );

        // 3. LLM API'sine POST İsteği At
        return this.llmWebClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1beta/models/gemini-2.0-flash:generateContent")
                        .queryParam("key", this.llmApiKey)
                        .build())
                .bodyValue(llmRequest)
                .retrieve() // İsteği gönder
                .bodyToMono(GeminiResponse.class) // Gelen yanıtı DTO'ya map'le
                .flatMap(geminiResponse -> {
                    // 4. LLM'in yanıtının içindeki 'text'i (JSON string) al
                    String jsonText = geminiResponse.getGeneratedText();
                    if (jsonText == null) {
                        return Mono.error(new RuntimeException("LLM'den boş yanıt geldi."));
                    }

                    // 5. LLM'in ürettiği JSON string'ini NewsResponseDTO'ya çevir
                    try {
                        // JSON'un başındaki ve sonundaki ```json ... ``` kısımlarını temizle
                        jsonText = jsonText.replace("```json", "").replace("```", "").trim();

                        jsonText = jsonText.replace("\\'", "'");

                        NewsResponseDTO newsResponse = objectMapper.readValue(jsonText, NewsResponseDTO.class);
                        return Mono.just(newsResponse);
                    } catch (Exception e) {
                        System.err.println("LLM'in ürettiği JSON parse edilemedi: " + e.getMessage());
                        System.err.println("GELEN HAM TEXT: " + jsonText);
                        return Mono.error(e);
                    }
                })
                .doOnError(error -> System.err.println("LLM API Hatası: " + error.getMessage()));
    }

    // --- ANA İŞ MANTIĞI (DEĞİŞİKLİK YOK, SADECE METOT ADI DEĞİŞTİ) ---
    public Mono<Void> fetchAndProcessNews(KafkaCategoryRequest request) {

        String category = request.getCategory();
        int count = request.getCount();
        // ADIM 1: Mock yerine GERÇEK LLM metodunu çağır
        Mono<NewsResponseDTO> llmResponseMono = this.fetchFromLlm(category, count);

        // ADIM 2: Gelen veriyi Kafka'nın bir sonraki topic'ine yolla
        return llmResponseMono
                .flatMap(newsResponse -> {
                    List<ArticleDTO> articles = newsResponse.getArticles();

                    if (articles == null || articles.isEmpty()) {
                        System.out.println("LLM'den haber bulunamadı (Kategori: " + category + ")");
                        return Mono.empty();
                    }

                    System.out.println(articles.size() + " adet GERÇEK haber (LLM) üretildi. " +
                            "Kafka topic'ine yollanıyor: " + this.processedTopicName);

                    articles.forEach(article -> {
                        // Her habere kategorisini de ekleyelim (eğer eksikse)
                        if (article.getCategory() == null || article.getCategory().isEmpty()) {
                            article.setCategory(category);
                        }
                        this.kafkaTemplate.send(this.processedTopicName, article);
                    });

                    return Mono.empty();
                })
                .doOnError(error -> System.err.println("Haber işleme hatası: " + error.getMessage()))
                .then(); // Mono<Void> döndür
    }

    private String createLlmPrompt(String category, int count) {
        // Prompt metni güncellendi: '3 adet' yerine '%d adet' gelecek
        return String.format("""
                'world' kategorisini görmezden gel ve SADECE '%s' kategorisiyle ilgili %d adet haber makalesi oluştur.
                Yanıtın, başka HİÇBİR AÇIKLAMA OLMADAN, doğrudan aşağıdaki JSON formatında olmalıdır.
                Tüm alanlar dolu olmalı, 'content' alanı en az 150 kelime olmalıdır.

                
                ***JSON FORMATI İÇİN HAYATİ KURALLAR:***
                1. JSON yapısını bozan karakterler kullanma.
                2. "title", "description" ve "content" alanlarının İÇERİĞİNDE **ASLA ÇİFT TIRNAK (") İŞARETİ KULLANMA.**
                3. Eğer bir şeyi vurgulaman veya alıntı yapman gerekiyorsa, **SADECE TEK TIRNAK (') KULLAN.** (Örnek: "Ali 'geliyorum' dedi" -> DOĞRU. "Ali "geliyorum" dedi" -> YANLIŞ/YASAK).
                4. Yanıtın saf bir JSON olmalı, başında ```json veya sonunda ``` olmamalı (varsa da kodum siliyor ama sen yine de koyma).
                ***ÇOK ÖNEMLİ KURAL: SENDEN KAÇ TANE HABER İSTEDİYSEM AŞAĞIDAKİ ÖRNEK VERDİĞİM JSON FORMATINDA O KADAR HABERİ BANA DÖNDÜRECEKSİN.
                *** AŞAĞIDA SANA 3 TANE HABER İSTEDİĞİM DURUMDA DÖNECEĞİN ÖRNEK JSON FORMATINI VERDİM. 4 TANE İSTESEYDİM totalResults = 4 olurdu ve ARTİCLES İÇİNDE 4 TANE HABER OLURDU.
                
                ```json
                {
                  "status": "ok",
                  "totalResults": %d,
                  "articles": [
                    {
                      "title": "İlk Haber Başlığı (Örnek \"Alıntı\" İçeriyor)",
                      "description": "İlk haberin kısa açıklaması.",
                      "content": "İlk haberin en az 100 kelimelik detaylı içeriği... Bu içerik de \"Alıntılanmış\" bir bölüm içerebilir.",
                      "url": "[https://gercekci-haber-sitesi.com/haber/ilk-haber-basligi-123](https://gercekci-haber-sitesi.com/haber/ilk-haber-basligi-123)",
                      "image_url": "[https://images.gercekci-haber-sitesi.com/resimler/ilk-haber.jpg](https://images.gercekci-haber-sitesi.com/resimler/ilk-haber.jpg)",
                      "category": "%s"
                    },
                    {
                      "title": "İkinci Haber Başlığı",
                      "description": "İkinci haberin kısa açıklaması.",
                      "content": "İkinci haberin en az 100 kelimelik detaylı içeriği...",
                      "url": "[https://baska-bir-site.net/makale/ikinci-haber-basligi-456](https://baska-bir-site.net/makale/ikinci-haber-basligi-456)",
                      "image_url": "[https://img.baska-bir-site.net/fotograflar/ikinci.png](https://img.baska-bir-site.net/fotograflar/ikinci.png)",
                      "category": "%s"
                    },
                    {
                      "title": "Üçüncü Haber Başlığı",
                      "description": "Üçüncü haberin kısa açıklaması.",
                      "content": "Üçüncü haberin en az 100 kelimelik detaylı içeriği...",
                      "url": "[https://teknoloji-portali.org/yazi/ucuncu-haber-789](https://teknoloji-portali.org/yazi/ucuncu-haber-789)",
                      "image_url": "[https://cdn.teknoloji-portali.org/gorseller/ucuncu-haber.webp](https://cdn.teknoloji-portali.org/gorseller/ucuncu-haber.webp)",
                      "category": "%s"
                    }
                  ]
                }
                ```
                """, category,count,count, category, category, category);
    }
}