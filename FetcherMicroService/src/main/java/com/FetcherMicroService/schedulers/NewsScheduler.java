package com.FetcherMicroService.schedulers;

import com.FetcherMicroService.dtos.KafkaCategoryRequest;
import com.FetcherMicroService.services.NewsService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

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
        System.out.println(">>> ZAMANLANMIŞ GÖREV BAŞLADI: Her kategoriden " + COUNT_PER_CATEGORY + " haber üretiliyor.");

        // Kategoriler üzerinde döngü yap ve her kategori için haber çekme işlemini başlat
        CATEGORIES.forEach(category -> {
            KafkaCategoryRequest request = new KafkaCategoryRequest(category, COUNT_PER_CATEGORY);

            System.out.println("   -> Başlatılıyor: Kategori: " + category + ", Sayı: " + COUNT_PER_CATEGORY);

            // NewsService'deki fonksiyonun Mono<Void> döndürdüğünü ve
            // sadece abone olunduğunda çalıştığını unutma!
            // Scheduler metodu Mono'yu bloke etmeden (blocking olmadan) çalışsın diye
            // basitçe abone oluyoruz.
            this.newsService.fetchAndProcessNews(request)
                    .doOnSuccess(v -> System.out.println("   -> BAŞARILI: Kategori: " + category))
                    .doOnError(error -> System.err.println("   -> HATA: Kategori: " + category + ". Hata: " + error.getMessage()))
                    .subscribe(); // Mono'yu çalıştırmak için subscribe olmak zorunludur.
        });

        System.out.println(">>> ZAMANLANMIŞ GÖREV BİTTİ (Asenkron haber çekme başlatıldı).");
    }
}