package com.FetcherMicroService.schedulers;

import com.FetcherMicroService.dtos.KafkaCategoryRequest;
import com.FetcherMicroService.services.NewsService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Component // Bu sınıfı Spring'in yönetimine alır
public class NewsScheduler {

    private final NewsService newsService;

    private static final List<String> CATEGORIES = Arrays.asList(
            "technology",
            "sports",
            "business",
            "health",
            "science",
            "economy",
            "fashion",
            "game",
            "music",
            "book",
            "nature",
            "education",
            "movie",
            "photography",
            "food",
            "art"
    );

    // Her çağrıda üretilecek haber sayısı
    private static final int COUNT_PER_CATEGORY = 2; // 👈 İsteğine göre 2

    public NewsScheduler(NewsService newsService) {
        this.newsService = newsService;
    }

    /**
     * Her kategoriden belirli sayıda haber üretmek için zamanlanmış metot.
     * Cron ifadesi: "0 0 * * * *" -> Her saat başında çalışır. (Saat 00 dakika 00 saniye)
     * * * * * * *
     * | | | | | |
     * | | | | | +--- Haftanın günü (0 - 7) (Pazartesiden Pazar'a)
     * | | | | +----- Ay (1 - 12)
     * | | | +------- Ayın günü (1 - 31)
     * | | +--------- Saat (0 - 23)
     * | +----------- Dakika (0 - 59)
     * +------------- Saniye (0 - 59)
     */
    @Scheduled(cron = "0 0 * * * *") // 💡 HER SAAT BAŞI ÇALIŞTIR
    public void generateNewsByCategories() {
        System.out.println(">>> ZAMANLANMIŞ GÖREV BAŞLADI...");

        // 💡 DEĞİŞİKLİK BURADA: forEach yerine Flux kullanıyoruz.
        // delayElements(Duration.ofSeconds(10)) -> Her kategori isteği arasında 10 saniye bekler.
        // Bu sayede dakikada 6 istek atarız, 429 hatası yemeyiz.

        Flux.fromIterable(CATEGORIES)
                .delayElements(Duration.ofSeconds(15)) // 👈 KRİTİK NOKTA: Her istek arası 10 sn mola
                .flatMap(category -> {
                    System.out.println("   -> Sıradaki Kategori İşleniyor: " + category);
                    KafkaCategoryRequest request = new KafkaCategoryRequest(category, COUNT_PER_CATEGORY);

                    return newsService.fetchAndProcessNews(request)
                            .doOnSuccess(v -> System.out.println("   -> BAŞARILI: " + category))
                            .doOnError(e -> System.err.println("   -> HATA: " + category + " - " + e.getMessage()));
                })
                .subscribe( // Akışı başlat
                        null,
                        error -> System.err.println("Scheduler Akış Hatası: " + error.getMessage()),
                        () -> System.out.println(">>> ZAMANLANMIŞ GÖREV (Tüm Kategoriler) TAMAMLANDI.")
                );
    }
}