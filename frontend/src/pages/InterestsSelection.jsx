import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_KEY, API_BASE_URL, ONBOARDING_API_BASE_URL } from "../config/api";

function InterestsSelection() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  // İlgi alanları listesi - her biri için isim, simge ve API kategori ismi
  const interests = [
    { id: 1, name: "Teknoloji", icon: "💻", category: "technology" },
    { id: 2, name: "Spor", icon: "⚽", category: "sports" },
    { id: 3, name: "Bilim", icon: "🔬", category: "science" },
    { id: 4, name: "Sağlık", icon: "🏥", category: "health" },
    { id: 5, name: "İş Dünyası", icon: "💼", category: "business" },
    { id: 6, name: "Eğlence", icon: "🎭", category: "entertainment" },
    { id: 7, name: "Politika", icon: "🏛️", category: "politics" },
    { id: 8, name: "Suç", icon: "🚨", category: "crime" },
    { id: 9, name: "Eğitim", icon: "📖", category: "education" },
    { id: 10, name: "Çevre", icon: "🌍", category: "environment" },
    { id: 11, name: "Yemek", icon: "🍔", category: "food" },
    { id: 12, name: "Yaşam Tarzı", icon: "✨", category: "lifestyle" },
    { id: 13, name: "Turizm", icon: "✈️", category: "tourism" },
  ];

  const toggleInterest = (interestId) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter((id) => id !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      alert("Lütfen en az bir ilgi alanı seçiniz!");
      return;
    }

    setLoading(true);

    try {
      // Seçilen ilgi alanlarının kategori isimlerini al
      const selectedCategories = interests
        .filter((interest) => selectedInterests.includes(interest.id))
        .map((interest) => interest.category);

      // Token'ı localStorage'dan al
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        navigate("/login");
        return;
      }

      // Onboarding API'ye POST isteği gönder
      console.log("Onboarding API Request:", {
        url: `${ONBOARDING_API_BASE_URL}/onboarding`,
        method: "POST",
        body: { categories: selectedCategories },
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
      });

      let onboardingResponse;
      try {
        onboardingResponse = await fetch(
          `${ONBOARDING_API_BASE_URL}/onboarding`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": API_KEY,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              categories: selectedCategories,
            }),
          }
        );
      } catch (fetchError) {
        console.error("Onboarding fetch error:", fetchError);
        throw new Error(
          `API'ye bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin. Hata: ${fetchError.message}`
        );
      }

      const responseText = await onboardingResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      // Konsola çıktıyı yazdır
      console.log("Onboarding API Response:", {
        status: onboardingResponse.status,
        statusText: onboardingResponse.statusText,
        headers: Object.fromEntries(onboardingResponse.headers.entries()),
        rawResponse: responseText,
        parsedData: responseData,
      });

      if (onboardingResponse.ok) {
        // updateFirstLogin endpoint'ine PUT isteği gönder
        try {
          const updateFirstLoginResponse = await fetch(
            `${API_BASE_URL}/users/updateFirstLogin`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-API-KEY": API_KEY,
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const updateResponseText = await updateFirstLoginResponse.text();
          let updateResponseData;
          try {
            updateResponseData = JSON.parse(updateResponseText);
          } catch {
            updateResponseData = { message: updateResponseText };
          }

          // Konsola çıktıyı yazdır
          console.log("Update First Login API Response:", {
            status: updateFirstLoginResponse.status,
            statusText: updateFirstLoginResponse.statusText,
            headers: Object.fromEntries(
              updateFirstLoginResponse.headers.entries()
            ),
            rawResponse: updateResponseText,
            parsedData: updateResponseData,
          });
        } catch (updateError) {
          console.error("Update First Login error:", updateError);
          // Hata olsa bile devam et
        }

        // Seçilen ilgi alanlarını kaydet
        const selectedInterestsData = interests.filter((interest) =>
          selectedInterests.includes(interest.id)
        );

        // Kullanıcı verisine ilgi alanlarını ekle ve firstLogin'ı false yap
        const updatedUserData = {
          interests: selectedInterestsData,
          firstLogin: false,
        };

        // Account data'yı güncelle
        const accountData = JSON.parse(
          localStorage.getItem("accountData") || "{}"
        );
        accountData.firstLogin = false;
        localStorage.setItem("accountData", JSON.stringify(accountData));

        // AuthContext'i güncelle
        updateUser(updatedUserData);

        alert("İlgi alanlarınız başarıyla kaydedildi!");
        navigate("/");
      } else {
        alert(
          responseData.message ||
            "İlgi alanları kaydedilirken bir hata oluştu. Lütfen tekrar deneyin."
        );
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      const errorMessage =
        error.message ||
        "İlgi alanları kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Başlık */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Lokum Haber" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            İlgi Alanlarınızı Seçin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Lokum Haber'de size daha iyi içerik sunabilmemiz için ilgi alanlarınızı seçin
          </p>
        </div>

        {/* İlgi Alanları Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all duration-200
                    ${
                      isSelected
                        ? "border-red-500 bg-red-50 shadow-md scale-105"
                        : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50"
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-4xl">{interest.icon}</span>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-red-700" : "text-gray-700"
                      }`}
                    >
                      {interest.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-6 w-6 bg-red-600 rounded-full flex items-center justify-center shadow-sm">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Seçim Sayısı */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-red-600">
                {selectedInterests.length}
              </span>{" "}
              ilgi alanı seçildi
            </p>
          </div>

          {/* Devam Et Butonu */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={selectedInterests.length === 0 || loading}
              className={`
                w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all
                ${
                  selectedInterests.length === 0 || loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transform hover:scale-[1.02] active:scale-[0.98]"
                }
              `}
            >
              {loading ? "Kaydediliyor..." : "Devam Et"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterestsSelection;
