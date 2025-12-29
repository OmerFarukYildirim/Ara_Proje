import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, ThumbsDown, Share2 } from "lucide-react";
import { API_KEY, FEED_API_BASE_URL, INTERACTION_API_BASE_URL } from "../config/api";

// Default haber görseli
const DEFAULT_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=800&fit=crop&q=80";

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

function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(DEFAULT_NEWS_IMAGE);
  const [showOriginalLink, setShowOriginalLink] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  
  // Zaman takibi ve interaction data
  const detailViewStartTime = useRef(null);
  const firstSpendingTime = useRef(location.state?.firstSpendingTime || 0);
  const newsIdFromState = useRef(location.state?.newsId || id);
  const categoryFromState = useRef(location.state?.category || "general");
  const newsTitleRef = useRef("Yükleniyor...");

  useEffect(() => {
    // State'den haber verisi var mı kontrol et
    const newsDataFromState = location.state?.newsData;
    
    if (newsDataFromState) {
      // State'den gelen veriyi direkt kullan
      const validatedImage = validateImageUrl(newsDataFromState.image_url);
      const formattedNews = {
        id: newsDataFromState.id,
        title: newsDataFromState.title || "Başlık Yok",
        content: newsDataFromState.content || newsDataFromState.description || "İçerik bulunamadı.",
        description: newsDataFromState.description || "",
        summary: newsDataFromState.summary || newsDataFromState.description || "",
        image: validatedImage,
        image_url: newsDataFromState.image_url || null, // Orijinal image_url'i koru
        category: newsDataFromState.category || "Genel",
        author: "Haber Kaynağı",
        publishDate: new Date().toLocaleDateString("tr-TR"),
        readTime: "5 dk",
        url: newsDataFromState.url || "#",
        tags: newsDataFromState.tags || [],
        entities: newsDataFromState.entities || [],
        sentiment_label: newsDataFromState.sentiment_label || "",
        sentiment_score: newsDataFromState.sentiment_score || null,
      };
      setNews(formattedNews);
      newsTitleRef.current = formattedNews.title;
      // image_url'i direkt kullan, validate edilmiş değil
      const imageUrl = newsDataFromState.image_url || newsDataFromState.image || DEFAULT_NEWS_IMAGE;
      setImageSrc(imageUrl);
      setCurrentImageSrc(imageUrl);
      
      // Category'yi güncelle
      if (formattedNews.category) {
        categoryFromState.current = formattedNews.category;
      }
      
      setLoading(false);
    } else {
      // State'de veri yoksa API'den çek (fallback - örneğin direkt URL ile gelindiğinde)
      const fetchNewsDetail = async () => {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("customerId");

        try {
          // Önce feed'den haberleri çek ve ilgili haberi bul
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

          if (response.ok) {
            let newsArray = [];
            if (Array.isArray(responseData)) {
              newsArray = responseData;
            } else if (responseData.data && Array.isArray(responseData.data)) {
              newsArray = responseData.data;
            }

            // ID'ye göre haberi bul
            const foundNews = newsArray.find((item) => item.id === id);

            if (foundNews) {
              const validatedImage = validateImageUrl(foundNews.image_url);
              const formattedNews = {
                id: foundNews.id,
                title: foundNews.title || "Başlık Yok",
                content: foundNews.content || foundNews.description || "İçerik bulunamadı.",
                description: foundNews.description || "",
                summary: foundNews.summary || foundNews.description || "",
                image: validatedImage,
                image_url: foundNews.image_url || null,
                category: foundNews.category || "Genel",
                author: "Haber Kaynağı",
                publishDate: new Date().toLocaleDateString("tr-TR"),
                readTime: "5 dk",
                url: foundNews.url || "#",
                tags: foundNews.tags || [],
                entities: foundNews.entities || [],
                sentiment_label: foundNews.sentiment_label || "",
                sentiment_score: foundNews.sentiment_score || null,
              };
      setNews(formattedNews);
      newsTitleRef.current = formattedNews.title;
      // image_url'i direkt kullan, validate edilmiş değil
      const imageUrl = foundNews.image_url || validatedImage || DEFAULT_NEWS_IMAGE;
      setImageSrc(imageUrl);
      setCurrentImageSrc(imageUrl);
              
              // Category'yi güncelle
              if (formattedNews.category) {
                categoryFromState.current = formattedNews.category;
              }
            }
          }
        } catch (error) {
          console.error("News detail error:", error);
        } finally {
          setLoading(false);
        }
      };

      if (id) {
        fetchNewsDetail();
      }
    }
  }, [id, location.state]);

  // Track-read API isteği gönder
  const sendTrackReadAPI = useCallback(async (newsId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("customerId");
    if (!token || !userId) return;

    const trackReadData = {
      user_id: userId.toString(),
      news_id: newsId,
    };

    try {
      console.log("Track-read API Request (from NewsDetail):", {
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

      console.log("Track-read API Response (from NewsDetail):", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
    } catch (error) {
      console.error("Track-read API error (from NewsDetail):", error);
    }
  }, []);

  // Interaction API isteği gönder
  const sendInteractionAPI = useCallback(async (newsId, category, firstSpendingTime, clickDetail, like, dislike, share, secondSpendingTime) => {
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
      console.log("Interaction API Request (from NewsDetail):", {
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

      console.log("Interaction API Response (from NewsDetail):", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
    } catch (error) {
      console.error("Interaction API error (from NewsDetail):", error);
    }
  }, []);

  // Detay sayfası görünür olduğunda zaman saymaya başla
  useEffect(() => {
    // Sayfa yüklendiğinde hemen başlat
    detailViewStartTime.current = Date.now();
    
    // Sayfa kapatıldığında veya navigate edildiğinde API istekleri gönder
    return () => {
      if (detailViewStartTime.current !== null) {
        const secondSpendingTime = (Date.now() - detailViewStartTime.current) / 1000; // saniye cinsinden
        
        // Interaction API isteği gönder
        sendInteractionAPI(
          newsIdFromState.current,
          categoryFromState.current,
          firstSpendingTime.current,
          "yes", // click_detail her zaman "yes" çünkü detay sayfasındayız
          isLiked ? "yes" : "no",
          isDisliked ? "yes" : "no",
          isShared ? "yes" : "no",
          secondSpendingTime
        );
        
        // Track-read API isteği gönder
        sendTrackReadAPI(newsIdFromState.current);
      }
    };
  }, [id, isLiked, isDisliked, isShared, sendInteractionAPI, sendTrackReadAPI]);

  // Tuş kombinasyonu ile orijinal haber linkini göster/gizle
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Shift + O kombinasyonu
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        setShowOriginalLink(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleImageError = (e) => {
    const currentSrc = e.target.src;
    
    // Eğer image_url yüklenemezse, haber akışındaki görseli dene (news.image)
    if (news?.image_url && currentSrc.includes(news.image_url)) {
      if (news?.image && news.image !== news.image_url) {
        setCurrentImageSrc(news.image);
        setImageSrc(news.image);
        e.target.src = news.image;
        setImageError(false);
        return;
      }
    }
    
    // Eğer news.image de yüklenemezse veya yoksa default görseli kullan
    if (!imageError || (news?.image && currentSrc.includes(news.image))) {
      setImageError(true);
      setCurrentImageSrc(DEFAULT_NEWS_IMAGE);
      setImageSrc(DEFAULT_NEWS_IMAGE);
      e.target.onerror = null;
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (isDisliked) {
      setIsDisliked(false);
    }
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked) {
      setIsLiked(false);
    }
  };

  const handleShare = () => {
    setIsShared(true);
    if (navigator.share && news) {
      navigator.share({
        title: news.title,
        text: news.summary || news.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link kopyalandı!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Haber yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-xl mb-4">Haber bulunamadı</p>
          <button
            onClick={() => navigate("/news")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Haberlere Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="relative w-full bg-gray-100">
        {/* Back Button */}
        <button
          onClick={() => navigate("/news")}
          className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white transition-colors shadow-md"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Image Container */}
        <div className="flex items-center justify-center py-8" style={{ minHeight: '400px' }}>
          <img
            src={currentImageSrc || news?.image_url || news?.image || imageSrc || DEFAULT_NEWS_IMAGE}
            alt={news.title}
            className="max-w-full max-h-[600px] w-auto h-auto object-contain"
            onError={handleImageError}
            onLoad={() => {
              if (imageError) {
                setImageError(false);
              }
            }}
          />
        </div>

        {/* Title Section - Görselin altında */}
        <div className="px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full mb-3">
              {news.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">{news.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{news.author}</span>
              <span>•</span>
              <span>{news.publishDate}</span>
              <span>•</span>
              <span>{news.readTime} okuma</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Action Buttons - Sticky */}
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 flex flex-col space-y-3">
          <button
            onClick={handleLike}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isLiked
                ? "bg-red-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Heart
              className="w-6 h-6"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </button>

          <button
            onClick={handleDislike}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isDisliked
                ? "bg-gray-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ThumbsDown
              className="w-6 h-6"
              fill={isDisliked ? "currentColor" : "none"}
              stroke="currentColor"
            />
          </button>

          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-white text-gray-700 hover:bg-gray-100 transition-all duration-300 shadow-lg flex items-center justify-center"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Article Content */}
        <article className="prose prose-xl max-w-none">
          {/* Summary */}
          {news.summary && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 mb-6 rounded-r-lg">
              <p className="text-gray-700 italic font-medium text-2xl">{news.summary}</p>
            </div>
          )}

          {/* Description */}
          {news.description && news.description !== news.summary && (
            <div className="bg-gray-50 p-5 mb-6 rounded-lg">
              <p className="text-gray-600 text-2xl">{news.description}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="text-gray-700 leading-relaxed whitespace-pre-line text-2xl mb-8">
            {news.content}
          </div>

          {/* Sentiment Info */}
          {news.sentiment_label && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Duygu Analizi:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  news.sentiment_label === "POSITIVE" 
                    ? "bg-green-100 text-green-800" 
                    : news.sentiment_label === "NEGATIVE"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {news.sentiment_label === "POSITIVE" ? "Pozitif" : 
                   news.sentiment_label === "NEGATIVE" ? "Negatif" : 
                   "Nötr"}
                </span>
                {news.sentiment_score !== null && (
                  <span className="text-sm text-gray-600">
                    (Skor: {news.sentiment_score.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Entities */}
          {news.entities && news.entities.length > 0 && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Varlıklar</h3>
              <div className="flex flex-wrap gap-2">
                {news.entities.map((entity, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {typeof entity === "string" ? entity : entity.name || JSON.stringify(entity)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Etiketler</h3>
              <div className="flex flex-wrap gap-2">
                {news.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold">Kategori:</span> {news.category}
              </div>
              <div>
                <span className="font-semibold">Haber ID:</span> {news.id}
              </div>
            </div>
          </div>

          {/* Original Article Link */}
          {news.url && news.url !== "#" && showOriginalLink && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Orijinal Haberi Oku
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

export default NewsDetail;

