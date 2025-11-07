package com.FetcherMicroService.services;

import com.FetcherMicroService.dtos.ArticleDTO;
import com.FetcherMicroService.dtos.NewsResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate; // Sadece Kafka importu
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

@Service
public class NewsService {

    // Sadece Kafka Producer (Yayıncı) ve topic adı kaldı
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String processedTopicName;

    // Artık WebClient.Builder, newsApiKey, newsApiBaseUrl almıyor
    public NewsService(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kafka.topic.news.processed}") String processedTopicName
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.processedTopicName = processedTopicName;
    }

    // --- BU METOT, SENİN SAHTE LLM METODUN (DEĞİŞİKLİK YOK) ---
    // (Attığın koddaki mock metodun aynısı)
    private Mono<NewsResponseDTO> getMockLlmResponse(String requestCategory) {
        System.out.println("!!! UYARI: LLM çağrılmadı. 'getMockLlmResponse' metodu çalıştı. !!!");

        ArticleDTO article1 = new ArticleDTO();
        article1.setTitle("Türkiye’de Akaryakıt Fiyatlarında Beklenmedik Artış: Sürücüler 5 Gün İçinde %12 Zamla Karşılaştı");
        article1.setDescription("Türkiye genelinde akaryakıt fiyatlarında beş günlük süreçte yaklaşık %12’lik artış yaşandı. Uzmanlar, döviz kurundaki yükseliş ve küresel petrol piyasasındaki dalgalanmaların etkili olduğunu belirtiyor.");
        article1.setContent("Bugün açıklanan verilere göre, Türkiye’de benzin ve motorin fiyatlarında peş peşe gelen zamlarla birlikte 5 gün içinde ortalama %12 oranında artış kaydedildi. Döviz kurundaki yükseliş ve yurtdışı petrol fiyatlarının artması, fiyatlara doğrudan yansırken özellikle günlük kullanımda olan sürücüler için yük artmış durumda. Uzmanlar, “Kur seviyelerindeki değişim ve tedarik zincirindeki aksaklıklar fiyatları hızla yukarı çekiyor” diyor. Ayrıca, ÖTV ve KDV oranlarında kısa vadede yapılabilecek indirimin tüketiciye çok geç yansıyabileceği uyarısı yapılıyor. Yarın yapılacak zam toplantısında, piyasa düzenleyicisinin ek önlemler duyurabileceği bekleniyor. Sürücüler, akaryakıt istasyonlarına gitmeden önce güncel fiyatları kontrol etmeleri konusunda bilgilendirildi.");

        article1.setUrl("https://www.dailysabah.com/economy/turkey-fuel-price-hike-over-12-percent-2025-11-07");
        article1.setImage_url("https://www.dailysabah.com/images/2025/11/07/istanbul-gas-station-queue.jpg");
        article1.setCategory(requestCategory);

        ArticleDTO article2 = new ArticleDTO();
        article2.setTitle("Türkiye Futbolunda Şok Gelişme: 17 Hakem ve Kulüp Başkanı Gözaltında");
        article2.setDescription("Türkiye’de futbol dünyasını sarsan bir operasyon gerçekleştirildi. 17 hakem ve bir Süper Lig kulübü başkanı, maç sonuçlarını etkilemeye yönelik yasa dışı bahislere ilişkin yürütülen soruşturma kapsamında gözaltına alındı.");
        article2.setContent("İstanbul Cumhuriyet Başsavcılığı’nın bugün yaptığı açıklamaya göre, ülke genelinde yürütülen “profesyonel liglerde maç sonuçlarına etki eden bahis” soruşturması kapsamında 21 kişiye yönelik yakalama kararı çıkarıldı. Bu kişiler arasında 17 aktif hakem ve bir Süper Lig kulübünün başkanı yer alıyor. Şu ana kadar 18 şüpheli gözaltına alındı. Soruşturmanın, toplam 571 aktif hakem arasından 371’inin bahis hesabı tuttuğu ve 152’sinin aktif olarak bahis oynadığı yönündeki tespitlerin ardından başlatıldığı belirtildi. Operasyon 12 farklı ilde eş zamanlı gerçekleştirildi. Ayrıca, Türkiye Futbol Federasyonu (TFF) Disiplin Kurulu da geçtiğimiz günlerde yürüttüğü iç soruşturmanın ardından 149 hakem ve yardımcı hakemi 8–12 ay süreyle hak mahrumiyeti cezası verdi. TFF Başkanı İbrahim Hacıosmanoğlu durumu “Türk futbolu için ahlaki bir kriz” olarak nitelendirdi. Savcılık tarafından yapılan yazılı açıklamada, şüphelilerin görevlerini kötüye kullanma, maçları manipüle etme ve sosyal medya üzerinden yanıltıcı bilgi yayma gibi suçlamalarla takibe alındığı bildirildi. Gözaltı kararlarının, “kaçma riskinin bulunması” ve “delil karartma ihtimaline” binaen verildiği kaydedildi. Operasyonun ardından futbol kulüpleri ve hakem camiası büyük bir şok yaşarken, kamuoyunda “Türk futbolu ne hâlde?” sorusu yeniden gündeme geldi. Hukukçular ve spor etik uzmanları, bu tür hakem ve bahis skandallarının kulüplerin finansal durumunu, sporun güvenilirliğini ve uluslararası imajını ciddi şekilde zedeleyebileceği konusunda uyarılarda bulundu. Ziyaret edilecek hususlar arasında şunlar yer alıyor: - Gözaltına alınan hakem ve kulüp başkanının kimlikleri resmi olarak henüz açıklanmadı. - Hakemlerin hangi maçlarda bahis oynadıkları ve manipülasyon iddialarının hangi maçları kapsadığı soruşturmanın kilit noktasını oluşturuyor. - TFF’nin ilerleyen günlerde hakem performanslarını ve hesap hareketlerini içeren yeni düzenleme paketleri açıklaması bekleniyor. Sporda şeffaflık ve hukuka bağlılık açısından kritik görülen bu gelişme, hem iç kamuoyunda hem de Avrupa futbol çevrelerinde yakından izleniyor.");
        article2.setUrl("https://www.reuters.com/sports/soccer/turkey-orders-arrest-17-referees-club-president-betting-probe-2025-11-07/");
        article2.setImage_url("https://www.reuters.com/resizer/XXXXXXXXXX.jpg");
        article2.setCategory(requestCategory);

        List<ArticleDTO> mockArticles = new ArrayList<>();
        mockArticles.add(article1);
        mockArticles.add(article2);

        NewsResponseDTO mockResponse = new NewsResponseDTO();
        mockResponse.setStatus("ok");
        mockResponse.setTotalResults(mockArticles.size());
        mockResponse.setArticles(mockArticles);

        return Mono.just(mockResponse);
    }

    // --- ANA İŞ MANTIĞI (Sadece Kafka'ya odaklı) ---
    public Mono<Void> fetchAndProcessNews(String category) {

        // ADIM 1: Gerçek API yerine SAHTE LLM metodunu çağır
        Mono<NewsResponseDTO> llmResponseMono = this.getMockLlmResponse(category);

        // ADIM 2: Gelen sahte veriyi KAFKA'NIN BİR SONRAKİ TOPIC'İNE YOLLA
        return llmResponseMono
                .flatMap(newsResponse -> {
                    List<ArticleDTO> articles = newsResponse.getArticles();

                    if (articles == null || articles.isEmpty()) {
                        System.out.println("Sahte LLM'den haber bulunamadı (Kategori: " + category + ")");
                        return Mono.empty();
                    }

                    System.out.println(articles.size() + " adet SAHTE haber (LLM taklidi) üretildi. " +
                            "Kafka topic'ine yollanıyor: " + this.processedTopicName);

                    // Her haberi bir sonraki topic'e (ai-enrichment için) yolla
                    articles.forEach(article -> {
                        this.kafkaTemplate.send(this.processedTopicName, article);
                    });

                    return Mono.empty();
                })
                .doOnError(error -> System.err.println("Haber işleme hatası: " + error.getMessage()))
                .then(); // Mono<Void> döndür
    }
}