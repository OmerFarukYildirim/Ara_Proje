import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Laptop,
  Trophy,
  Microscope,
  HeartPulse,
  Briefcase,
  Theater,
  Landmark,
  ShieldAlert,
  GraduationCap,
  Leaf,
  UtensilsCrossed,
  Sparkles,
  Plane,
  Newspaper,
} from "lucide-react";

// Default haber görseli
const DEFAULT_NEWS_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=800&fit=crop&q=80";

// Kategorilere göre icon mapping
const getCategoryIcon = (category) => {
  const categoryLower = (category || "").toLowerCase();
  const iconProps = { className: "w-32 h-32 text-white" };

  switch (categoryLower) {
    case "technology":
    case "teknoloji":
      return <Laptop {...iconProps} />;
    case "sports":
    case "spor":
      return <Trophy {...iconProps} />;
    case "science":
    case "bilim":
      return <Microscope {...iconProps} />;
    case "health":
    case "sağlık":
      return <HeartPulse {...iconProps} />;
    case "business":
    case "iş":
    case "iş dünyası":
      return <Briefcase {...iconProps} />;
    case "entertainment":
    case "eğlence":
      return <Theater {...iconProps} />;
    case "politics":
    case "politika":
      return <Landmark {...iconProps} />;
    case "crime":
    case "suç":
      return <ShieldAlert {...iconProps} />;
    case "education":
    case "eğitim":
      return <GraduationCap {...iconProps} />;
    case "environment":
    case "çevre":
      return <Leaf {...iconProps} />;
    case "food":
    case "yemek":
      return <UtensilsCrossed {...iconProps} />;
    case "lifestyle":
    case "yaşam tarzı":
      return <Sparkles {...iconProps} />;
    case "tourism":
    case "turizm":
    case "seyahat":
      return <Plane {...iconProps} />;
    default:
      return <Newspaper {...iconProps} />;
  }
};

// Kategorilere göre gradient renkler
const getCategoryGradient = (category) => {
  const categoryLower = (category || "").toLowerCase();

  switch (categoryLower) {
    case "technology":
    case "teknoloji":
      return "from-blue-600 via-cyan-600 to-blue-500";
    case "sports":
    case "spor":
      return "from-orange-600 via-red-600 to-orange-500";
    case "science":
    case "bilim":
      return "from-indigo-600 via-blue-600 to-cyan-600";
    case "health":
    case "sağlık":
      return "from-red-600 via-pink-600 to-rose-600";
    case "business":
    case "iş":
    case "iş dünyası":
      return "from-slate-600 via-gray-600 to-slate-500";
    case "entertainment":
    case "eğlence":
      return "from-purple-600 via-pink-600 to-rose-600";
    case "politics":
    case "politika":
      return "from-blue-700 via-indigo-700 to-blue-600";
    case "crime":
    case "suç":
      return "from-red-700 via-rose-700 to-red-600";
    case "education":
    case "eğitim":
      return "from-blue-600 via-indigo-600 to-purple-600";
    case "environment":
    case "çevre":
      return "from-green-600 via-emerald-600 to-teal-600";
    case "food":
    case "yemek":
      return "from-orange-500 via-red-500 to-pink-500";
    case "lifestyle":
    case "yaşam tarzı":
      return "from-pink-500 via-rose-500 to-red-500";
    case "tourism":
    case "turizm":
    case "seyahat":
      return "from-sky-600 via-blue-500 to-cyan-500";
    default:
      return "from-gray-600 via-gray-500 to-gray-400";
  }
};

function NewsCard({ news, index, isActive, onNext, onPrevious, onCardClick }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const cardViewStartTime = useRef(null);
  const cardViewDuration = useRef(0);
  const [imageSrc, setImageSrc] = useState(() => {
    // İlk yüklemede geçerli bir URL kontrolü yap
    const url = news.image;
    if (!url || url.trim() === "") {
      return DEFAULT_NEWS_IMAGE;
    }
    // Geçersiz URL formatlarını kontrol et
    try {
      new URL(url);
      return url;
    } catch {
      return DEFAULT_NEWS_IMAGE;
    }
  });

  // Kart görünür olduğunda zaman saymaya başla
  useEffect(() => {
    if (isActive) {
      cardViewStartTime.current = Date.now();
      cardViewDuration.current = 0;
    } else if (cardViewStartTime.current !== null) {
      // Kart görünmez olduğunda süreyi hesapla
      cardViewDuration.current = Date.now() - cardViewStartTime.current;
      cardViewStartTime.current = null;
    }
  }, [isActive]);

  const handleCardClick = (e) => {
    // Butonlara tıklanırsa navigate etme
    if (e.target.closest("button")) {
      return;
    }

    // Kart görünürken geçen süreyi hesapla
    if (cardViewStartTime.current !== null) {
      cardViewDuration.current = Date.now() - cardViewStartTime.current;
    }

    // click_detail'i işaretle
    if (onCardClick) {
      onCardClick();
    }

    // Tüm haber verisini state ile detay sayfasına gönder
    navigate(`/news/${news.id}`, {
      state: {
        cardViewDuration: cardViewDuration.current,
        firstSpendingTime: cardViewDuration.current / 1000, // saniye cinsinden
        newsId: news.id,
        category: news.category,
        newsData: news, // Tüm haber verisi
        cardIndex: index, // Kartın index'i
      },
    });
  };


  const handleImageError = (e) => {
    // Görsel yüklenemezse default görseli kullan
    if (!imageError) {
      setImageError(true);
      setImageSrc(DEFAULT_NEWS_IMAGE);
      // Sonsuz döngüyü önlemek için onError'u kaldır
      e.target.onerror = null;
    }
  };

  const handleImageLoad = () => {
    // Görsel başarıyla yüklendiğinde hata durumunu sıfırla
    if (imageError) {
      setImageError(false);
    }
  };

  // news.image değiştiğinde görseli güncelle
  useEffect(() => {
    const url = news.image;
    if (!url || url.trim() === "") {
      setImageSrc(DEFAULT_NEWS_IMAGE);
      setImageError(false);
      return;
    }
    // Geçerli URL kontrolü
    try {
      new URL(url);
      setImageSrc(url);
      setImageError(false);
    } catch {
      setImageSrc(DEFAULT_NEWS_IMAGE);
      setImageError(false);
    }
  }, [news.image]);

  return (
    <div
      className={`w-full max-w-md mx-auto transition-all duration-300 ${
        isActive ? "opacity-100" : "opacity-60"
      }`}
      onClick={handleCardClick}
    >
      {/* Instagram tarzı kart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        {/* Üst başlık bölümü */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white">
              <img 
                src="/logo.png" 
                alt="Lokum Haber" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-gray-600 font-bold text-xs">LH</span>';
                }}
              />
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm">{news.author}</p>
              <p className="text-gray-500 text-xs">{news.publishDate}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {news.category}
            </span>
          </div>
        </div>

        {/* Görsel */}
        <div className="relative w-full aspect-square bg-gray-100">
          <img
            src={imageSrc}
            alt={news.title}
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {/* Kategori badge - görsel üzerinde */}
          <div className="absolute top-2 right-2">
            <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
              {news.category}
            </div>
          </div>
        </div>

        {/* Okuma süresi */}
        <div className="px-4 py-2 flex items-center justify-end border-b border-gray-200">
          <span className="text-gray-500 text-xs">{news.readTime}</span>
        </div>

        {/* İçerik */}
        <div className="px-4 py-3">
          <h2 className="text-gray-900 font-semibold text-base mb-2 leading-tight">
            {news.title}
          </h2>
          {news.summary && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {news.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewsCard;
