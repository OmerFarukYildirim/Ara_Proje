import React, { useState, useEffect } from "react";
import { API_KEY, API_BASE_URL } from "../config/api";

function ContactForms() {
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Arama fonksiyonu
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredForms(forms);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = forms.filter((form) => {
        const topic = (form.topic || "").toLowerCase();
        const email = (form.email || "").toLowerCase();
        const phoneNumber = (form.phoneNumber || "").toLowerCase();
        const content = (form.content || "").toLowerCase();
        
        return (
          topic.includes(query) ||
          email.includes(query) ||
          phoneNumber.includes(query) ||
          content.includes(query)
        );
      });
      setFilteredForms(filtered);
    }
  }, [searchQuery, forms]);

  // Giriş kontrolü
  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginData.username === "Admin123" && loginData.password === "Admin123!") {
      localStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
    } else {
      setLoginError("Kullanıcı adı veya şifre hatalı!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
    setForms([]);
    setFilteredForms([]);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchForms = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      try {
        console.log("Get All Forms API Request:", {
          url: `${API_BASE_URL}/users/allForm`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        const response = await fetch(`${API_BASE_URL}/users/allForm`, {
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

        console.log("Get All Forms API Response:", {
          status: response.status,
          statusText: response.statusText,
          rawResponse: responseText,
          parsedData: data,
        });

        if (response.ok) {
          // API'den gelen veriyi işle
          let formsData = [];
          if (Array.isArray(data)) {
            formsData = data;
          } else if (data.data && Array.isArray(data.data)) {
            formsData = data.data;
          } else if (data.statusCode === 200 && data.data && Array.isArray(data.data)) {
            formsData = data.data;
          }

          setForms(formsData);
          setFilteredForms(formsData);
        } else {
          setError(data.message || "Formlar yüklenirken bir hata oluştu.");
        }
      } catch (error) {
        console.error("Get All Forms API error:", error);
        setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [isAuthenticated]);

  // Giriş ekranı
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Girişi</h2>
            <p className="text-gray-600">İletişim formlarına erişmek için giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                placeholder="Kullanıcı adınızı girin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  placeholder="Şifrenizi girin"
                  required
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
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Formlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-rose-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
          {/* Başlık ve Çıkış Butonu */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">İletişim Formları</h1>
              <p className="text-black">Gönderilen tüm formların listesi</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              Çıkış Yap
            </button>
          </div>

          {/* Arama Kutusu */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                placeholder="Konu, e-posta, telefon veya içerikte ara..."
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                {filteredForms.length} sonuç bulundu
              </p>
            )}
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Form Listesi */}
          {filteredForms.length === 0 ? (
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
              <p className="mt-4 text-gray-600">
                {searchQuery ? "Arama sonucu bulunamadı." : "Henüz form bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredForms.map((form, index) => (
                <div
                  key={form.id || index}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black mb-2">
                          {form.topic || "Konu Belirtilmemiş"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-black mb-1">E-posta</p>
                            <p className="text-base font-medium text-black">
                              {form.email || "Belirtilmemiş"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-black mb-1">Telefon</p>
                            <p className="text-base font-medium text-black">
                              {form.phoneNumber || "Belirtilmemiş"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-2">İçerik</p>
                      <p className="text-base text-black leading-relaxed whitespace-pre-line">
                        {form.content || "İçerik bulunmuyor"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactForms;

