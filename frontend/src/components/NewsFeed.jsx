import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import NewsCard from "./NewsCard";
import { useAuth } from "../contexts/AuthContext";
import { API_KEY, FEED_API_BASE_URL, INTERACTION_API_BASE_URL } from "../config/api";

// Görsel URL'sini doğrula
const validateImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return null;
  }
  try {
    const parsedUrl = new URL(url);
    // HTTP veya HTTPS protokolü olmalı
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    // Geçersiz URL formatı
    return null;
  }
};

function NewsFeed() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Sayfa yüklendiğinde sessionStorage'dan index'i yükle
    const savedIndex = sessionStorage.getItem('newsFeed_index');
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const [newsData, setNewsData] = useState(() => {
    // Sayfa yüklendiğinde sessionStorage'dan haber verilerini yükle
    const savedData = sessionStorage.getItem('newsFeed_data');
    return savedData ? JSON.parse(savedData) : [];
  });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isProgrammaticScrollRef = useRef(false); // Programatik scroll kontrolü için
  
  // Interaction tracking için refs
  const cardViewStartTimes = useRef({}); // Her kart için başlangıç zamanı
  const cardInteractionData = useRef({}); // Her kart için interaction verileri (like, dislike, share, click_detail)
  const previousIndexRef = useRef(0);

  // currentIndex değiştiğinde sessionStorage'a kaydet
  useEffect(() => {
    if (newsData.length > 0) {
      sessionStorage.setItem('newsFeed_index', currentIndex.toString());
    }
  }, [currentIndex, newsData.length]);

  // newsData değiştiğinde sessionStorage'a kaydet
  useEffect(() => {
    if (newsData.length > 0) {
      sessionStorage.setItem('newsFeed_data', JSON.stringify(newsData));
    }
  }, [newsData]);

  // Navigasyon fonksiyonları - önce tanımlanmalı
  const goToNext = useCallback(() => {
    isProgrammaticScrollRef.current = true;
    setCurrentIndex((prevIndex) => {
      if (prevIndex < newsData.length - 1) {
        setIsScrolling(true);
        setTimeout(() => setIsScrolling(false), 500);
        return prevIndex + 1;
      }
      return prevIndex;
    });
  }, [newsData.length]);

  const goToPrevious = useCallback(() => {
    isProgrammaticScrollRef.current = true;
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        setIsScrolling(true);
        setTimeout(() => setIsScrolling(false), 500);
        return prevIndex - 1;
      }
      return prevIndex;
    });
  }, []);

  // Scroll animasyonu için CSS ekle
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .news-container {
        scroll-behavior: smooth;
        scroll-snap-type: y mandatory;
        overflow-y: auto;
        width: 100%;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
      }
      
      @media (min-width: 768px) {
        .news-container {
          left: auto;
          right: auto;
        }
      }
      
      .news-item {
        scroll-snap-align: start;
        scroll-snap-stop: always;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100%;
      }
      
      .news-container::-webkit-scrollbar {
        width: 8px;
      }
      
      .news-container::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .news-container::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      .news-container::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Klavye navigasyonu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isScrolling) return;

      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isScrolling, goToNext, goToPrevious]);

  // Mouse wheel navigasyonu - doğal scroll'a izin ver, scroll event listener index'i güncelleyecek
  // Wheel event handler kaldırıldı, scroll event listener mouse wheel scroll'unu da yakalayacak

  // Touch navigasyonu
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (isScrolling) return;

    touchEndY.current = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY.current;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  // Track-read API isteği gönder
  const sendTrackReadAPI = useCallback(async (newsId) => {
    const token = localStorage.getItem("token");
    const userId = user?.id || localStorage.getItem("customerId");
    if (!token || !userId) return;

    const trackReadData = {
      user_id: userId.toString(),
      news_id: newsId,
    };

    try {
      console.log("Track-read API Request:", {
        url: `${FEED_API_BASE_URL}/track-read`,
        method: "POST",
        body: trackReadData,
      });

      const response = await fetch(`${FEED_API_BASE_URL}/track-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(trackReadData),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log("Track-read API Response:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
    } catch (error) {
      console.error("Track-read API error:", error);
    }
  }, [user]);

  // Interaction API isteği gönder
  const sendInteractionAPI = useCallback(async (newsId, category, firstSpendingTime, clickDetail, like = "no", dislike = "no", share = "no", secondSpendingTime = 0.0) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const interactionData = {
      news_id: newsId,
      category: category,
      like: like,
      dislike: dislike,
      first_spending_time: firstSpendingTime,
      click_detail: clickDetail,
      second_spending_time: secondSpendingTime,
      share: share,
    };

    try {
      console.log("Interaction API Request:", {
        url: `${INTERACTION_API_BASE_URL}/interaction`,
        method: "POST",
        body: interactionData,
      });

      const response = await fetch(`${INTERACTION_API_BASE_URL}/interaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(interactionData),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log("Interaction API Response:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
    } catch (error) {
      console.error("Interaction API error:", error);
    }
  }, []);

  // Kart görüntülenme süresini takip et ve kart değiştiğinde API isteği gönder
  useEffect(() => {
    // Önceki kart için süreyi hesapla ve API isteği gönder
    if (previousIndexRef.current !== currentIndex && newsData.length > 0) {
      const previousNews = newsData[previousIndexRef.current];
      if (previousNews) {
        const startTime = cardViewStartTimes.current[previousNews.id];
        if (startTime) {
          const spendingTime = (Date.now() - startTime) / 1000; // saniye cinsinden
          const interactionData = cardInteractionData.current[previousNews.id] || {};
          
          // Eğer detay sayfasına gidildiyse (click_detail: "yes"), NewsFeed'de API isteği gönderme
          // Çünkü NewsDetail'de gönderilecek (first spending time + second spending time ile)
          if (interactionData.clickDetail !== "yes") {
            // Kaydırırken haber değişirse API isteği gönder
            sendInteractionAPI(
              previousNews.id,
              previousNews.category || "general",
              spendingTime,
              interactionData.clickDetail || "no",
              interactionData.like || "no",
              interactionData.dislike || "no",
              interactionData.share || "no"
            );
            
            // Track-read API isteği gönder
            sendTrackReadAPI(previousNews.id);
            
            // Sadece detay sayfasına gitmediyse verileri temizle
            delete cardViewStartTimes.current[previousNews.id];
            delete cardInteractionData.current[previousNews.id];
          }
          // Eğer detay sayfasına gidildiyse, verileri temizleme
          // Çünkü first spending time detay sayfasına state ile gönderildi
          // ve detay sayfasından çıkınca tek seferde istek atılacak
        }
      }
    }

    // Yeni kart için zaman saymaya başla
    if (newsData.length > 0 && newsData[currentIndex]) {
      const currentNews = newsData[currentIndex];
      cardViewStartTimes.current[currentNews.id] = Date.now();
      
      // Interaction data'yı başlat
      if (!cardInteractionData.current[currentNews.id]) {
        cardInteractionData.current[currentNews.id] = {
          like: "no",
          dislike: "no",
          share: "no",
          clickDetail: "no",
        };
      }
    }

    previousIndexRef.current = currentIndex;
  }, [currentIndex, newsData, sendInteractionAPI, sendTrackReadAPI]);

  // Haber detay sayfasına gidildiğinde click_detail'i işaretle ve index'i kaydet
  const handleCardClick = useCallback((newsId, index) => {
    if (cardInteractionData.current[newsId]) {
      cardInteractionData.current[newsId].clickDetail = "yes";
    }
    // Tıklanan kartın index'ini sessionStorage'a kaydet
    sessionStorage.setItem('newsFeed_clickedIndex', index.toString());
    console.log("📍 Haber tıklandı, index kaydedildi:", index);
  }, []);

  // Akışı yenile butonu - sessionStorage'ı temizle ve yeni feed isteği at
  const handleRefreshFeed = useCallback(async () => {
    // SessionStorage'ı temizle
    sessionStorage.removeItem('newsFeed_data');
    sessionStorage.removeItem('newsFeed_index');
    sessionStorage.removeItem('newsFeed_clickedIndex');
    
    // State'leri sıfırla
    setNewsData([]);
    setCurrentIndex(0);
    setLoading(true);
    
    // Scroll'u en üste al
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Yeni feed isteği at
    const userId = user?.id || localStorage.getItem("customerId");
    const token = localStorage.getItem("token");

    if (!userId || !token) {
      console.warn("User ID veya token bulunamadı");
      setLoading(false);
      return;
    }

    try {
      console.log("🔄 Akış yenileniyor - Feed API Request:", {
        url: `${FEED_API_BASE_URL}/feed/${userId}`,
        method: "GET",
      });

      const response = await fetch(
        `${FEED_API_BASE_URL}/feed/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log("Feed API Response:", {
        status: response.status,
        statusText: response.statusText,
        parsedData: responseData,
      });

      // API'den gelen verileri işle
      if (response.ok && Array.isArray(responseData)) {
        const formattedNews = responseData.map((item) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          title: item.title || "Başlık Yok",
          content: item.content || item.description || "İçerik bulunamadı.",
          summary: item.summary || item.description || "",
          image: validateImageUrl(item.image_url),
          image_url: item.image_url || null,
          category: item.category || "Genel",
          author: "Lokum Haber",
          publishDate: new Date().toLocaleDateString("tr-TR"),
          readTime: "3 dk",
          url: item.url || "#",
        }));
        
        setNewsData(formattedNews);
        setCurrentIndex(0);
      } else if (
        response.ok &&
        responseData.data &&
        Array.isArray(responseData.data)
      ) {
        const formattedNews = responseData.data.map((item) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          title: item.title || "Başlık Yok",
          content: item.content || item.description || "İçerik bulunamadı.",
          summary: item.summary || item.description || "",
          image: validateImageUrl(item.image_url),
          image_url: item.image_url || null,
          category: item.category || "Genel",
          author: "Lokum Haber",
          publishDate: new Date().toLocaleDateString("tr-TR"),
          readTime: "3 dk",
          url: item.url || "#",
        }));
        
        setNewsData(formattedNews);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Feed API error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Tıklanan index'e scroll yap - newsData yüklendikten sonra
  useEffect(() => {
    if (!loading && newsData.length > 0 && containerRef.current) {
      const clickedIndex = sessionStorage.getItem('newsFeed_clickedIndex');
      
      if (clickedIndex !== null) {
        const targetIndex = parseInt(clickedIndex, 10);
        
        if (targetIndex >= 0 && targetIndex < newsData.length) {
          // Biraz bekle ki DOM tam render olsun
          setTimeout(() => {
            const items = containerRef.current?.querySelectorAll('.news-item');
            if (items && items[targetIndex]) {
              console.log("📍 Tıklanan index'e scroll yapılıyor:", targetIndex);
              setCurrentIndex(targetIndex);
              
              // Scroll yap
              items[targetIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
              
              // Index'i kullandıktan sonra temizle
              sessionStorage.removeItem('newsFeed_clickedIndex');
            } else {
              // Retry - DOM henüz hazır değilse
              setTimeout(() => {
                const retryItems = containerRef.current?.querySelectorAll('.news-item');
                if (retryItems && retryItems[targetIndex]) {
                  console.log("📍 Retry: Tıklanan index'e scroll yapılıyor:", targetIndex);
                  setCurrentIndex(targetIndex);
                  retryItems[targetIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                  sessionStorage.removeItem('newsFeed_clickedIndex');
                }
              }, 500);
            }
          }, 100);
        }
      }
    }
  }, [loading, newsData.length]);

  // Scroll pozisyonunu güncelle - sadece programatik navigasyon için (klavye, touch)
  // Mouse wheel scroll'unu engellememek için sadece programatik değişikliklerde çalışır
  useEffect(() => {
    if (containerRef.current && newsData.length > 0 && isProgrammaticScrollRef.current) {
      const items = containerRef.current.querySelectorAll('.news-item');
      if (items[currentIndex]) {
        setIsScrolling(true);
        items[currentIndex].scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setTimeout(() => {
          setIsScrolling(false);
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
    }
  }, [currentIndex, newsData.length]);


  // Intersection Observer ile görünür item'ı tespit et ve currentIndex'i güncelle
  // Mouse wheel scroll'unu da yakalar
  useEffect(() => {
    const container = containerRef.current;
    if (!container || newsData.length === 0) return;

    const items = container.querySelectorAll('.news-item');
    if (items.length === 0) return;

    // Her item için Intersection Observer oluştur
    const observers = [];
    const visibleItems = new Map(); // Her item için görünürlük durumu

    const observerOptions = {
      root: container,
      rootMargin: '-40% 0px -40% 0px', // Viewport'un ortasındaki %20'lik alan
      threshold: [0, 0.1, 0.5, 1.0]
    };

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.dataset.index, 10);
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          // Item görünür ve yeterince görünür alanda
          visibleItems.set(index, {
            ratio: entry.intersectionRatio,
            boundingClientRect: entry.boundingClientRect
          });
        } else {
          visibleItems.delete(index);
        }
      });

      // En çok görünür olan item'ı bul
      if (visibleItems.size > 0) {
        let maxRatio = 0;
        let bestIndex = currentIndex;

        visibleItems.forEach((data, index) => {
          if (data.ratio > maxRatio) {
            maxRatio = data.ratio;
            bestIndex = index;
          }
        });

        // Eğer farklı bir index bulunduysa güncelle
        if (bestIndex !== currentIndex && bestIndex >= 0 && bestIndex < newsData.length) {
          console.log("🖱️ Mouse scroll ile index güncellendi:", bestIndex, "ratio:", maxRatio);
          setCurrentIndex(bestIndex);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // Her item'ı observe et
    items.forEach((item, index) => {
      item.dataset.index = index.toString();
      observer.observe(item);
      observers.push({ item, observer });
    });

    return () => {
      // Cleanup
      observers.forEach(({ item, observer: obs }) => {
        obs.unobserve(item);
      });
      observer.disconnect();
    };
  }, [newsData.length, currentIndex]);

  // Scroll event listener - yedek mekanizma (Intersection Observer çalışmazsa)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || newsData.length === 0) return;

    let scrollTimeout;
    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      // isScrolling kontrolünü kaldırdık - mouse wheel scroll'unu yakalamak için
      const currentScrollTop = container.scrollTop;
      
      // Scroll yönü değiştiyse veya yeterince scroll yapıldıysa kontrol et
      if (Math.abs(currentScrollTop - lastScrollTop) < 10) return;
      lastScrollTop = currentScrollTop;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const items = container.querySelectorAll('.news-item');
        if (items.length === 0) return;
        
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const viewportCenter = scrollTop + containerHeight / 2;
        
        // Viewport'un ortasına en yakın item'ı bul
        let newIndex = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemTop = item.offsetTop;
          const itemCenter = itemTop + item.offsetHeight / 2;
          const distance = Math.abs(viewportCenter - itemCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            newIndex = i;
          }
        }

        if (
          newIndex !== currentIndex &&
          newIndex >= 0 &&
          newIndex < newsData.length
        ) {
          console.log("🖱️ Scroll event ile index güncellendi:", newIndex);
          setCurrentIndex(newIndex);
        }
      }, 50); // Daha kısa debounce - mouse wheel için
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, newsData.length]);

  // Route değiştiğinde (başka sayfaya gidildiğinde) sessionStorage'ı temizleme
  // Sadece NewsFeed sayfasından tamamen çıkıldığında temizle, haber detay sayfasına gidildiğinde koru
  useEffect(() => {
    // Eğer NewsFeed sayfasından başka bir sayfaya gidildiyse (haber detay hariç) sessionStorage'ı temizle
    // Haber detay sayfası: /news/:id formatında
    const isNewsDetailPage = /^\/news\/\d+/.test(location.pathname);
    const isNewsFeedPage = location.pathname === '/news';
    
    if (!isNewsFeedPage && !isNewsDetailPage) {
      // NewsFeed veya NewsDetail sayfasında değilse sessionStorage'ı temizle
      sessionStorage.removeItem('newsFeed_data');
      sessionStorage.removeItem('newsFeed_index');
      sessionStorage.removeItem('newsFeed_clickedIndex');
    }
  }, [location.pathname]);

  // Sayfa yüklendiğinde Feed API çağrısı yap
  useEffect(() => {
    const fetchFeed = async () => {
      if (!user || !user.id) {
        console.warn("User ID bulunamadı");
        setLoading(false);
        return;
      }

      // SessionStorage'dan veri kontrolü
      const savedData = sessionStorage.getItem('newsFeed_data');
      const savedIndex = sessionStorage.getItem('newsFeed_index');
      
      if (savedData && savedIndex !== null) {
        // SessionStorage'da veri varsa, API isteği atmadan yükle
        try {
          const parsedData = JSON.parse(savedData);
          const parsedIndex = parseInt(savedIndex, 10);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log("📦 SessionStorage'dan haber verileri yüklendi, index:", parsedIndex);
            setNewsData(parsedData);
            setCurrentIndex(parsedIndex);
            setLoading(false);
            
            // Scroll işlemi ayrı useEffect'te yapılacak (tıklanan index için)
            return; // API isteği atma
          }
        } catch (error) {
          console.error("SessionStorage veri parse hatası:", error);
          // Hata durumunda devam et, API'den çek
        }
      }

      // SessionStorage'da veri yoksa veya hatalıysa API'den çek
      // Scroll'u en üste al (yeni veri geldiğinde)
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
      setCurrentIndex(0);

      const userId = user.id;
      const token = localStorage.getItem("token");

      try {
        console.log("Feed API Request:", {
          url: `${FEED_API_BASE_URL}/feed/${userId}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await fetch(
          `${FEED_API_BASE_URL}/feed/${userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": API_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { message: responseText };
        }

        // Konsola çıktıyı yazdır
        console.log("Feed API Response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponse: responseText,
          parsedData: responseData,
        });

        // API'den gelen verileri işle
        if (response.ok && Array.isArray(responseData)) {
          // API verilerini NewsCard formatına dönüştür
          const formattedNews = responseData.map((item) => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            title: item.title || "Başlık Yok",
            content: item.content || item.description || "İçerik bulunamadı.",
            summary: item.summary || item.description || "",
            image: validateImageUrl(item.image_url), // Geçersiz URL'ler null olacak, NewsCard default görsel kullanacak
            image_url: item.image_url || null, // Orijinal image_url'i koru
            category: item.category || "Genel",
            author: "Lokum Haber",
            publishDate: new Date().toLocaleDateString("tr-TR"),
            readTime: "3 dk",
            url: item.url || "#",
          }));
          
          // Kategorileri say ve konsola yazdır
          const categoryCount = {};
          formattedNews.forEach((news) => {
            const category = news.category || "Genel";
            categoryCount[category] = (categoryCount[category] || 0) + 1;
          });
          console.log("📊 Kategori Sayıları:", categoryCount);
          console.log("📈 Toplam Kategori Sayısı:", Object.keys(categoryCount).length);
          console.log("📰 Toplam Haber Sayısı:", formattedNews.length);
          
          setNewsData(formattedNews);
        } else if (
          response.ok &&
          responseData.data &&
          Array.isArray(responseData.data)
        ) {
          // Eğer veri data içinde ise
          const formattedNews = responseData.data.map((item) => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            title: item.title || "Başlık Yok",
            content: item.content || item.description || "İçerik bulunamadı.",
            summary: item.summary || item.description || "",
            image: validateImageUrl(item.image_url), // Geçersiz URL'ler null olacak, NewsCard default görsel kullanacak
            image_url: item.image_url || null, // Orijinal image_url'i koru
            category: item.category || "Genel",
            author: "Lokum Haber",
            publishDate: new Date().toLocaleDateString("tr-TR"),
            readTime: "3 dk",
            url: item.url || "#",
          }));
          
          // Kategorileri say ve konsola yazdır
          const categoryCount = {};
          formattedNews.forEach((news) => {
            const category = news.category || "Genel";
            categoryCount[category] = (categoryCount[category] || 0) + 1;
          });
          console.log("📊 Kategori Sayıları:", categoryCount);
          console.log("📈 Toplam Kategori Sayısı:", Object.keys(categoryCount).length);
          console.log("📰 Toplam Haber Sayısı:", formattedNews.length);
          
          setNewsData(formattedNews);
        }
      } catch (error) {
        console.error("Feed API error:", error);
      } finally {
        setLoading(false);
        // Veriler yüklendikten sonra scroll'u en üste al (sadece yeni veri geldiğinde)
        // SessionStorage'dan yüklenmediyse
        if (!savedData || !savedIndex) {
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
            setCurrentIndex(0);
          }, 100);
        }
      }
    };

    fetchFeed();
  }, [user]);

  // Giriş kontrolü - localStorage'dan kontrol et
  const checkAuth = () => {
    const customerId = localStorage.getItem("customerId");
    const token = localStorage.getItem("token");
    return !!(customerId && token);
  };

  // Auth yüklenene kadar bekle
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Yükleniyor...</div>
      </div>
    );
  }

  // Giriş yapılmamışsa mesaj göster
  if (!checkAuth() || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">Lütfen giriş yapın</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Haberler yükleniyor...</div>
      </div>
    );
  }

  if (newsData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Henüz haber bulunmuyor.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Akışı Yenile Butonu */}
      <div className="fixed top-20 right-4 z-50 md:top-4 md:right-auto md:left-1/2 md:transform md:-translate-x-1/2">
        <button
          onClick={handleRefreshFeed}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
          title="Akışı Yenile"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{loading ? "Yenileniyor..." : "Akışı Yenile"}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="news-container relative mx-auto w-full md:w-1/3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {newsData.map((news, index) => (
          <div key={news.id} className="news-item">
            <NewsCard
              news={news}
              index={index}
              isActive={index === currentIndex}
              onNext={goToNext}
              onPrevious={goToPrevious}
              onCardClick={() => handleCardClick(news.id, index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default NewsFeed;
