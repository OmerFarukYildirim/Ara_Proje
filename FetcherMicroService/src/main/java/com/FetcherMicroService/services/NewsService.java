package com.FetcherMicroService.services; // Senin paket adın farklı olabilir

import com.FetcherMicroService.dtos.ArticleDTO;
import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map; // Python'dan gelen JSON'u karşılamak için Map kullanabiliriz

@Service
public class NewsService {

    // NewsAPI ile ilgili her şeyi sildik
    private final WebClient aiEnrichmentWebClient;

    public NewsService(WebClient.Builder webClientBuilder,
                       // YENİ: ai.enrichment.url'yi application.properties'ten oku
                       @Value("${ai.enrichment.url}") String aiEnrichmentUrl) {

        // Artık sadece :8000'deki AI servisine bağlanıyoruz
        this.aiEnrichmentWebClient = webClientBuilder
                .baseUrl(aiEnrichmentUrl) // http://127.0.0.1:8000
                .build();
    }

    // --- BU METOT, SENİN "ÖRNEK YAZMA İŞİNİ" YAPIYOR ---
    // Gelecekte burayı LLM'i çağıran gerçek kodla değiştireceksin
    private Mono<NewsResponseDTO> getMockLlmResponse(String requestCategory) {
        System.out.println("!!! UYARI: LLM çağrılmadı. 'getMockLlmResponse' metodu çalıştı. !!!");

        // 1. Sahte ArticleDTO'lar oluştur (İstediğin 5 alanla)
        ArticleDTO article1 = new ArticleDTO();
        article1.setTitle("Premier League: Can Man City or Liverpool realistically catch Arsenal in the title race and how many points are needed?");
        article1.setContent("Arsenal have moved four points clear at the top of the Premier League with Liverpool and Man City both slipping up last weekend; Gary Neville believes Arsenal will need to record in the high 80s points-wise to win the Premier League title - but is he right? Arsenal have pulled off eight wins in a row in all competitions - winning the last six without conceding a goal. The Gunners have only conceded twice since the September international break - while only Erling Haaland has managed to score from open play against this Arsenal defence all season. And if they keep going like this, they're also on course to break Chelsea's record for the fewest goals conceded in a Premier League season. Jose Mourinho's Blues let in just 15 goals in the 2004/05 campaign - but Arsenal are on course to let in just 13.");
        article1.setUrl("https://www.skysports.com/football/news/11661/13458699/premier-league-can-man-city-or-liverpool-realistically-catch-arsenal-in-the-title-race-and-how-many-points-are-needed");
        article1.setImage_url("https://example.com/images/java.png");
        article1.setCategory(requestCategory); // Kategori, isteğe göre dinamik

        ArticleDTO article2 = new ArticleDTO();
        article2.setTitle("Chelsea transfer news, rumours and gossip: Live updates and latest on deals, signings, loans and contracts");
        article2.setContent("Enzo Maresca has revealed Liam Delap apologised to him and the Chelsea squad after his red card at Wolves. \n" +
                "\n" +
                "Delap was sent off for picking up two needless yellow cards in their 4-3 Carabao Cup victory on Wednesday with Maresca criticising the striker saying it was \"stupid and embarrassing\".\n" +
                "\n" +
                "Speaking on Friday, the Chelsea head coach said: \"I spoke with Liam, he knows everything, he's aware of the situation, he knows that he made a mistake. Full stop. No more than that.\n" +
                "\n" +
                "\"Straight after the game, in the changing room, he apologised to everyone. Maresca had said on Wednesday that Delap was guilty of \"playing the game for himself\", but clarified his comments. \n" +
                "\n" +
                "\"I'm not from England so sometimes when I try to translate from Italian to English, sometimes it's a bit different,\" he said.\n" +
                "\n" +
                "\"Liam, on the pitch, is more focused on his battle with the central defender than the rest. This was what I was trying to say after the Wolves game.\"\n" +
                "\n" +
                "Asked whether that was how he wanted Delap to play, Maresca said: \"There are three players in this team that I know better than the rest: Romeo Lavia, Cole Palmer and Liam Delap. I know them from four years ago. ");
        article2.setUrl("https://www.skysports.com/football/live-blog/11668/13025497/chelsea-transfer-news-rumours-and-gossip-live-updates-and-latest-on-deals-signings-loans-and-contracts");
        article2.setImage_url("https://example.com/images/python.png");
        article2.setCategory(requestCategory);

        List<ArticleDTO> mockArticles = new ArrayList<>();
        mockArticles.add(article1);
        mockArticles.add(article2);

        // 2. Bu sahte listeyi, sanki bir API'den gelmiş gibi NewsResponseDTO'ya sar
        // Not: AI-Enrichment'ın List<ArticleDTO> beklemesi için bunu yapıyoruz.
        NewsResponseDTO mockResponse = new NewsResponseDTO();
        mockResponse.setStatus("ok");
        mockResponse.setTotalResults(mockArticles.size());
        mockResponse.setArticles(mockArticles);

        return Mono.just(mockResponse);
    }

    // Bu metot, NewsController tarafından çağrılan ana metot
    public Mono<Map> fetchAndEnrichNews(String category) {

        // ADIM 1: Gerçek API yerine SAHTE LLM metodunu çağır
        Mono<NewsResponseDTO> llmResponseMono = this.getMockLlmResponse(category);

        // ADIM 2: Gelen sahte veriyi DOĞRUDAN AI-ENRICHMENT'A yolla
        return llmResponseMono
                .flatMap(newsResponse -> {
                    List<ArticleDTO> articles = newsResponse.getArticles();

                    if (articles == null || articles.isEmpty()) {
                        return Mono.just(Map.of("message", "Sahte LLM'den haber bulunamadı.", "saved_count", 0));
                    }

                    System.out.println(articles.size() + " adet SAHTE haber (LLM taklidi) üretildi. " +
                            "Doğrudan AI-Enrichment servisine yollanıyor...");

                    // AI-Enrichment servisinin (:8000) /enrich-and-save endpoint'ine POST at
                    return this.aiEnrichmentWebClient.post()
                            .uri("/enrich-and-save") // ai-enrichment'taki endpoint
                            .bodyValue(articles)
                            .retrieve()
                            .bodyToMono(Map.class); // AI servisinden gelen onayı ({"saved_count": ...}) al
                })
                .doOnError(error -> System.err.println("AI-Enrichment servisine bağlanırken Hata: " + error.getMessage()));
    }
}