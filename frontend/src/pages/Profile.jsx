import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_KEY, API_BASE_URL, ONBOARDING_API_BASE_URL, FEED_API_BASE_URL } from "../config/api";

function Profile() {
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [chartType, setChartType] = useState("bar"); // "bar", "pie" veya "score"
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Profil düzenleme state'leri
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phoneNumber: "",
    password: ""
  });

  useEffect(() => {
    // Account bilgilerini yükle
    const loadAccountData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        // Önce localStorage'dan kontrol et
        const cachedAccountData = localStorage.getItem("accountData");
        if (cachedAccountData) {
          try {
            const parsed = JSON.parse(cachedAccountData);
            setAccountData(parsed);
            setLoading(false);
          } catch (e) {
            console.error("Error parsing cached account data:", e);
          }
        }

        // API'den güncel bilgileri al
        const response = await fetch(`${API_BASE_URL}/users/account`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: responseText };
        }

        if (response.ok && data.statusCode === 200 && data.data) {
          setAccountData(data.data);
          localStorage.setItem("accountData", JSON.stringify(data.data));
          
          // ID'yi localStorage'a kaydet
          if (data.data.id) {
            localStorage.setItem("userId", data.data.id.toString());
          }
        }
      } catch (error) {
        console.error("Error loading account data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountData();
  }, []);

  // Recommendations API çağrısı
  useEffect(() => {
    const fetchRecommendations = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      if (!userId || !token) {
        setRecommendationsLoading(false);
        return;
      }

      try {
        console.log("Recommendations API Request:", {
          url: `${ONBOARDING_API_BASE_URL}/recommendations/${userId}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await fetch(
          `${ONBOARDING_API_BASE_URL}/recommendations/${userId}`,
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

        console.log("Recommendations API Response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponse: responseText,
          parsedData: data,
        });

        // API yanıtındaki kategorileri detaylı konsola yazdır
        if (data.categories && Array.isArray(data.categories)) {
          console.log("API'den gelen kategoriler:", data.categories);
          data.categories.forEach((cat, index) => {
            console.log(`Kategori ${index + 1}:`, {
              category: cat.category,
              score: cat.score,
              tümObje: cat
            });
          });
        }

        // Kategorileri normalize et (toplam %100 olacak şekilde)
        let normalizedCategories = [];
        if (data.categories && Array.isArray(data.categories)) {
          const totalScore = data.categories.reduce((sum, cat) => sum + (cat.score || 0), 0);
          normalizedCategories = data.categories.map(cat => ({
            ...cat,
            percentage: totalScore > 0 ? ((cat.score || 0) / totalScore) * 100 : 0
          }));
        }

        setRecommendations({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponse: responseText,
          parsedData: data,
          normalizedCategories,
        });
      } catch (error) {
        console.error("Recommendations API error:", error);
        setRecommendations({
          error: error.message || "Bir hata oluştu",
        });
      } finally {
        setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // Profil güncelleme fonksiyonu
  const handleUpdateProfile = async () => {
    if (!formData.name.trim() || !formData.surname.trim() || !formData.phoneNumber.trim()) {
      alert("Lütfen tüm alanları doldurun (şifre opsiyonel)");
      return;
    }

    // Şifre validasyonu - şifre girildiyse kontrol et
    if (formData.password.trim()) {
      if (formData.password.length < 8) {
        alert("Şifre en az 8 karakter olmalıdır!");
        return;
      }
      if (!/[A-Z]/.test(formData.password)) {
        alert("Şifre en az 1 büyük harf içermelidir!");
        return;
      }
      if (!/[0-9]/.test(formData.password)) {
        alert("Şifre en az 1 rakam içermelidir!");
        return;
      }
      if (!/[@#$%^&+=!]/.test(formData.password)) {
        alert("Lütfen geçerli karakterlerden birini kullan (@#$%^&+=!)");
        return;
      }
    }

    setIsUpdating(true);
    const token = localStorage.getItem("token");

    try {
      // Güncelleme için gönderilecek veri
      const updateData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        phoneNumber: formData.phoneNumber.trim(),
      };

      // Şifre varsa ekle
      if (formData.password.trim()) {
        updateData.password = formData.password.trim();
      }

      console.log("Update Profile API Request:", {
        url: `${API_BASE_URL}/users/update`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: updateData,
      });

      const response = await fetch(`${API_BASE_URL}/users/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }

      console.log("Update Profile API Response:", {
        status: response.status,
        statusText: response.statusText,
        data: data,
      });

      if (response.ok) {
        // Başarılı güncelleme
        alert("Profil başarıyla güncellendi!");
        
        // Account data'yı yeniden yükle
        const accountResponse = await fetch(`${API_BASE_URL}/users/account`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const accountResponseText = await accountResponse.text();
        let accountData;
        try {
          accountData = JSON.parse(accountResponseText);
        } catch {
          accountData = { message: accountResponseText };
        }

        if (accountResponse.ok && accountData.statusCode === 200 && accountData.data) {
          setAccountData(accountData.data);
          localStorage.setItem("accountData", JSON.stringify(accountData.data));
        }

        setIsEditing(false);
        setFormData({
          name: "",
          surname: "",
          phoneNumber: "",
          password: ""
        });
      } else {
        const errorMessage = data.message || data.error || "Profil güncellenirken bir hata oluştu. Lütfen tekrar deneyin.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Update profile error:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetAlgorithm = async () => {
    if (!window.confirm("Keşfet algoritmasını sıfırlamak istediğinizden emin misiniz? Bu işlem ilgi alanlarınızı ve öğrenme verilerinizi sıfırlayacaktır.")) {
      return;
    }

    setIsResetting(true);
    const token = localStorage.getItem("token");

    try {
      // Reset scores API çağrısı
      console.log("Reset Scores API Request:", {
        url: `${ONBOARDING_API_BASE_URL}/reset-scores`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
      });

      const resetScoresResponse = await fetch(
        `${ONBOARDING_API_BASE_URL}/reset-scores`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resetScoresResponseText = await resetScoresResponse.text();
      let resetScoresData;
      try {
        resetScoresData = JSON.parse(resetScoresResponseText);
      } catch {
        resetScoresData = { message: resetScoresResponseText };
      }

      console.log("Reset Scores API Response:", {
        status: resetScoresResponse.status,
        statusText: resetScoresResponse.statusText,
        headers: Object.fromEntries(resetScoresResponse.headers.entries()),
        rawResponse: resetScoresResponseText,
        parsedData: resetScoresData,
      });

      // İlgi alanlarını sıfırla (onboarding API'sine boş array gönder)
      const resetResponse = await fetch(
        `${ONBOARDING_API_BASE_URL}/onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            categories: [],
          }),
        }
      );

      const resetResponseText = await resetResponse.text();
      let resetData;
      try {
        resetData = JSON.parse(resetResponseText);
      } catch {
        resetData = { message: resetResponseText };
      }

      if (resetScoresResponse.ok && resetResponse.ok) {
        alert("Keşfet algoritması başarıyla sıfırlandı!");
        // Modal'ı göster
        setShowInterestsModal(true);
      } else {
        const errorMessage = resetScoresData.message || resetData.message || "Algoritma sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Reset algorithm error:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsResetting(false);
    }
  };
  
  // Kategori isimlerini Türkçe'ye çeviren fonksiyon
  const getCategoryName = (categoryKey) => {
    const categoryNames = {
      economy: "Ekonomi",
      science: "Bilim",
      travel: "Seyahat",
      movie: "Film",
      book: "Kitap",
      nature: "Doğa",
      technology: "Teknoloji",
      sports: "Spor",
      music: "Müzik",
      food: "Yemek",
      game: "Oyun",
      education: "Eğitim",
      art: "Sanat",
      fashion: "Moda",
      photography: "Fotoğraf",
      health: "Sağlık",
      business: "İş Dünyası",
      entertainment: "Eğlence",
      politics: "Politika",
      crime: "Suç",
      environment: "Çevre",
      lifestyle: "Yaşam Tarzı",
      tourism: "Turizm"
    };
    return categoryNames[categoryKey] || categoryKey || "Bilinmeyen";
  };

  // Kullanıcı bilgilerini API'den gelen data'dan al
  const userInfo = accountData || {};
  const name = userInfo.name || "";
  const surname = userInfo.surname || "";
  const email = userInfo.email || "";
  const phoneNumber = userInfo.phoneNumber || "";
  const fullName = name && surname ? `${name} ${surname}` : name || surname || "Kullanıcı";

  // İsim baş harflerini al (avatar için)
  const getInitials = () => {
    if (name && surname) {
      return `${name[0]}${surname[0]}`.toUpperCase();
    }
    if (name) {
      return name[0].toUpperCase();
    }
    if (surname) {
      return surname[0].toUpperCase();
    }
    return "K";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
          {/* Profil Başlığı */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-rose-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-3xl font-bold">{getInitials()}</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">
              {fullName}
              </h2>
          </div>

          {/* Kullanıcı Bilgileri */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Kullanıcı Bilgileri</h3>
              {!isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setFormData({
                      name: name || "",
                      surname: surname || "",
                      phoneNumber: phoneNumber || "",
                      password: ""
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                >
                  Düzenle
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* İsim */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      placeholder="Adınızı girin"
                    />
                  </div>

                  {/* Soyisim */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      placeholder="Soyadınızı girin"
                    />
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon Numarası
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      placeholder="Telefon numaranızı girin"
                    />
                  </div>

                  {/* Şifre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Şifre (Opsiyonel)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                        placeholder="Yeni şifrenizi girin"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center z-10 hover:text-red-600 cursor-pointer transition-colors focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      >
                        {showPassword ? (
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Şifre validasyon kuralları - sadece şifre girildiğinde göster */}
                    {formData.password && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-3">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">
                          Şifre Gereksinimleri:
                        </h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li
                            className={`flex items-center ${
                              formData.password.length >= 8
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 mr-2 ${
                                formData.password.length >= 8
                                  ? "text-green-500"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            En az 8 karakter
                          </li>
                          <li
                            className={`flex items-center ${
                              /[0-9]/.test(formData.password)
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 mr-2 ${
                                /[0-9]/.test(formData.password)
                                  ? "text-green-500"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            En az 1 rakam
                          </li>
                          <li
                            className={`flex items-center ${
                              /[A-Z]/.test(formData.password)
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 mr-2 ${
                                /[A-Z]/.test(formData.password)
                                  ? "text-green-500"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            En az 1 büyük harf
                          </li>
                          <li
                            className={`flex items-center ${
                              /[@#$%^&+=!]/.test(formData.password)
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            <svg
                              className={`w-3 h-3 mr-2 ${
                                /[@#$%^&+=!]/.test(formData.password)
                                  ? "text-green-500"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            En az 1 özel karakter (@#$%^&+=!)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* E-posta (sadece göster) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email || ""}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">E-posta adresi değiştirilemez</p>
                </div>

                {/* Butonlar */}
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                  >
                    {isUpdating ? "Güncelleniyor..." : "Kaydet"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: "",
                        surname: "",
                        phoneNumber: "",
                        password: ""
                      });
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* İsim */}
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-gray-600 mb-1">Ad</p>
                <p className="text-lg font-semibold text-gray-800">
                  {name || "Belirtilmemiş"}
              </p>
            </div>

              {/* Soyisim */}
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-sm text-gray-600 mb-1">Soyad</p>
                <p className="text-lg font-semibold text-gray-800">
                  {surname || "Belirtilmemiş"}
                </p>
          </div>

              {/* E-posta */}
              <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                <p className="text-sm text-gray-600 mb-1">E-posta Adresi</p>
                <p className="text-lg font-semibold text-gray-800 break-all">
                  {email || "Belirtilmemiş"}
                </p>
            </div>

              {/* Telefon */}
              <div className="p-4 bg-red-100 rounded-xl border border-red-200">
                <p className="text-sm text-gray-600 mb-1">Telefon Numarası</p>
                <p className="text-lg font-semibold text-gray-800">
                  {phoneNumber || "Belirtilmemiş"}
                </p>
            </div>
            </div>
            )}
          </div>

          {/* Okuma Geçmişi Butonu */}
          <div className="mt-8">
            <button
              onClick={() => navigate("/read-history")}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>Okuma Geçmişi</span>
            </button>
          </div>

          {recommendationsLoading && (
            <div className="mt-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Recommendations yükleniyor...</p>
            </div>
          )}

          {/* İlgi Alanlarım - Görselleştirme */}
          {recommendations && recommendations.normalizedCategories && recommendations.normalizedCategories.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">İlgi Alanlarım</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      chartType === "bar"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Sütun Grafik
                  </button>
                  <button
                    onClick={() => setChartType("pie")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      chartType === "pie"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Dairesel Grafik
                  </button>
                  <button
                    onClick={() => setChartType("score")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      chartType === "score"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Puanlar
                  </button>
                </div>
              </div>

              {chartType === "bar" ? (
                // Sütun Grafik
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="space-y-4">
                    {recommendations.normalizedCategories.map((category, index) => {
                      const colors = [
                        "bg-red-500", "bg-rose-500", "bg-pink-500", "bg-purple-500",
                        "bg-indigo-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500",
                        "bg-green-500", "bg-lime-500", "bg-yellow-500", "bg-amber-500",
                        "bg-orange-500", "bg-red-600", "bg-rose-600", "bg-pink-600"
                      ];
                      const color = colors[index % colors.length];
                      
                      // Kategori ismini Türkçe'ye çevir
                      const categoryName = getCategoryName(category.category);
                      
                      return (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="w-32 text-sm font-medium text-gray-700">
                            {categoryName}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: `${category.percentage}%` }}
                            >
                              {category.percentage > 5 && (
                                <span className="text-xs font-semibold text-white">
                                  {category.percentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {category.percentage <= 5 && (
                            <div className="w-16 text-sm font-medium text-gray-600 text-right">
                              {category.percentage.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : chartType === "pie" ? (
                // Dairesel Grafik (Pie Chart)
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                    {/* Pie Chart SVG */}
                    <div className="flex-shrink-0">
                      <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
                        {(() => {
                          let currentAngle = 0;
                          const colors = [
                            "#ef4444", "#f43f5e", "#ec4899", "#a855f7",
                            "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6",
                            "#10b981", "#84cc16", "#eab308", "#f59e0b",
                            "#f97316", "#dc2626", "#e11d48", "#db2777"
                          ];
                          
                          return recommendations.normalizedCategories.map((category, index) => {
                            const percentage = category.percentage;
                            const angle = (percentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            const startAngleRad = (startAngle * Math.PI) / 180;
                            const endAngleRad = (endAngle * Math.PI) / 180;
                            
                            const x1 = 150 + 120 * Math.cos(startAngleRad);
                            const y1 = 150 + 120 * Math.sin(startAngleRad);
                            const x2 = 150 + 120 * Math.cos(endAngleRad);
                            const y2 = 150 + 120 * Math.sin(endAngleRad);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M 150 150`,
                              `L ${x1} ${y1}`,
                              `A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              `Z`
                            ].join(" ");
                            
                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                                className="transition-all hover:opacity-80"
                              />
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommendations.normalizedCategories.map((category, index) => {
                        const colors = [
                          "#ef4444", "#f43f5e", "#ec4899", "#a855f7",
                          "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6",
                          "#10b981", "#84cc16", "#eab308", "#f59e0b",
                          "#f97316", "#dc2626", "#e11d48", "#db2777"
                        ];
                        const color = colors[index % colors.length];
                        
                        // Kategori ismini Türkçe'ye çevir
                        const categoryName = getCategoryName(category.category);
                        
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="text-sm text-gray-700">{categoryName}</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {category.percentage.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // Score Listesi
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="space-y-3">
                    {recommendations.normalizedCategories.map((category, index) => {
                      // Kategori ismini Türkçe'ye çevir
                      const categoryName = getCategoryName(category.category);
                      const score = category.score || 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <span className="text-base font-medium text-gray-800">
                            {categoryName}
                          </span>
                          <span className="text-xl font-bold text-red-600">
                            {score.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keşfet Algoritmasını Sıfırla */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Keşfet Algoritması
            </h3>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-800 mb-1">
                    Algoritmayı Sıfırla
                  </p>
                  <p className="text-sm text-gray-600">
                    İlgi alanlarınızı ve öğrenme verilerinizi sıfırlayarak 
                    keşfet algoritmasını yeniden başlatın. Bu işlem geri alınamaz.
                  </p>
                </div>
                <button
                  onClick={handleResetAlgorithm}
                  disabled={isResetting}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  {isResetting ? "Sıfırlanıyor..." : "Sıfırla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* İlgi Alanları Seçimi Modal */}
      {showInterestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-100">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-rose-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Algoritma Sıfırlandı!
              </h3>
              <p className="text-gray-600">
                İlgi alanlarınızı tekrar seçmek ister misiniz?
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowInterestsModal(false);
                  navigate("/interests");
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                Evet, Seçmek İstiyorum
              </button>
              <button
                onClick={() => setShowInterestsModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Hayır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
