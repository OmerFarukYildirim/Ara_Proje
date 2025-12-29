import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_KEY, FEED_API_BASE_URL } from "../config/api";

function ReadHistory() {
  const navigate = useNavigate();
  const [readHistory, setReadHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReadHistory = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      try {
        console.log("Read History API Request:", {
          url: `${FEED_API_BASE_URL}/user/read-history`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await fetch(
          `${FEED_API_BASE_URL}/user/read-history`,
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
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: responseText };
        }


        if (response.ok) {
          // API'den gelen veriyi işle
          let historyData = [];
          if (Array.isArray(data)) {
            historyData = data;
          } else if (data.data && Array.isArray(data.data)) {
            historyData = data.data;
          } else if (data.readHistory && Array.isArray(data.readHistory)) {
            historyData = data.readHistory;
          }

          setReadHistory(historyData);
        } else {
          setError(data.message || "Okuma geçmişi yüklenirken bir hata oluştu.");
        }
      } catch (error) {
        console.error("Read History API error:", error);
        setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    fetchReadHistory();
  }, []);

  const handleNewsClick = (newsId) => {
    // HistoryNewsDetail sayfasına yönlendir
    navigate(`/read-history/${newsId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Okuma geçmişi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
          {/* Başlık */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Okuma Geçmişi</h1>
              <p className="text-gray-600">Okuduğunuz haberlerin listesi</p>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Profil
            </button>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Haber Listesi */}
          {readHistory.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-600">Henüz okuma geçmişiniz bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {readHistory.map((news, index) => {
                const newsId = news.news_id || news.id || news.newsId;
                return (
                <div
                  key={newsId || index}
                  onClick={() => handleNewsClick(newsId)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-200 overflow-hidden flex flex-row"
                >
                  {news.image_url && (
                    <img
                      src={news.image_url}
                      alt={news.title}
                      className="w-32 h-32 md:w-40 md:h-40 object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                        {news.title || "Başlık Yok"}
                      </h3>
                      {news.summary && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {news.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {news.readDate && (
                        <span className="text-xs text-gray-500">
                          {new Date(news.readDate).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                      <span className="text-red-600 text-sm font-semibold hover:text-red-700">
                        Devamını Oku →
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReadHistory;

