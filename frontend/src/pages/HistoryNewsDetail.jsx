import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ThumbsDown, Bookmark, Share2 } from "lucide-react";
import { API_KEY, FEED_API_BASE_URL } from "../config/api";

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

function HistoryNewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(DEFAULT_NEWS_IMAGE);
  
  // Zaman takibi
  const detailViewStartTime = useRef(null);
  const newsTitleRef = useRef("Yükleniyor...");

  useEffect(() => {
    const fetchNewsDetail = async () => {
      const token = localStorage.getItem("token");

      if (!token || !id) {
        setLoading(false);
        return;
      }

      try {
        console.log("News Detail API Request:", {
          url: `${FEED_API_BASE_URL}/news/detail/${id}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await fetch(
          `${FEED_API_BASE_URL}/news/detail/${id}`,
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

        console.log("News Detail API Response:", {
          status: response.status,
          statusText: response.statusText,
          rawResponse: responseText,
          parsedData: responseData,
        });

        if (response.ok) {
          // API'den gelen veriyi işle
          const newsData = responseData.data || responseData;
          const validatedImage = validateImageUrl(newsData.image_url || newsData.image);
          const formattedNews = {
            id: newsData.id || id,
            title: newsData.title || "Başlık Yok",
            content: newsData.content || newsData.description || "İçerik bulunamadı.",
            description: newsData.description || "",
            summary: newsData.summary || newsData.description || "",
            image: validatedImage,
            image_url: newsData.image_url || newsData.image || null,
            category: newsData.category || "Genel",
            author: newsData.author || "Haber Kaynağı",
            publishDate: newsData.publishDate || newsData.publishedAt || new Date().toLocaleDateString("tr-TR"),
            readTime: newsData.readTime || "5 dk",
            url: newsData.url || "#",
            tags: newsData.tags || [],
            entities: newsData.entities || [],
            sentiment_label: newsData.sentiment_label || "",
            sentiment_score: newsData.sentiment_score || null,
          };
          setNews(formattedNews);
          newsTitleRef.current = formattedNews.title;
          setImageSrc(validatedImage || DEFAULT_NEWS_IMAGE);
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
  }, [id]);

  // Detay sayfası görünür olduğunda zaman saymaya başla
  useEffect(() => {
    // Sayfa yüklendiğinde hemen başlat
    detailViewStartTime.current = Date.now();
    
    // Sayfa kapatıldığında veya navigate edildiğinde konsola yazdır
    return () => {
      if (detailViewStartTime.current !== null) {
        const detailViewDuration = Date.now() - detailViewStartTime.current;
        
        console.log("=== Haber Görüntüleme İstatistikleri ===");
        console.log(`Haber ID: ${id}`);
        console.log(`Haber Başlığı: ${newsTitleRef.current}`);
        console.log(`Detay Sayfası Süresi: ${(detailViewDuration / 1000).toFixed(2)} saniye`);
        console.log("========================================");
      }
    };
  }, [id]);

  const handleImageError = (e) => {
    if (!imageError) {
      setImageError(true);
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

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
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
            onClick={() => navigate("/read-history")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Okuma Geçmişine Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="relative h-96 w-full">
        <img
          src={imageSrc}
          alt={news.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => navigate("/read-history")}
          className="absolute top-4 left-4 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full mb-3">
              {news.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{news.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-white/80">
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
            onClick={handleBookmark}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isBookmarked
                ? "bg-yellow-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Bookmark
              className="w-6 h-6"
              fill={isBookmarked ? "currentColor" : "none"}
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
        <article className="prose prose-lg max-w-none">
          {/* Summary */}
          {news.summary && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
              <p className="text-gray-700 italic font-medium">{news.summary}</p>
            </div>
          )}

          {/* Description */}
          {news.description && news.description !== news.summary && (
            <div className="bg-gray-50 p-4 mb-6 rounded-lg">
              <p className="text-gray-600">{news.description}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="text-gray-700 leading-relaxed whitespace-pre-line text-lg mb-8">
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
          {news.url && news.url !== "#" && (
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

export default HistoryNewsDetail;

