import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL, API_KEY } from "../config/api";

function Login() {
  const [step, setStep] = useState(1); // 1: Login, 2: Verify
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [verifyData, setVerifyData] = useState({
    email: "",
    link: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleVerifyChange = (e) => {
    const { name, value } = e.target;
    setVerifyData({
      ...verifyData,
      [name]: value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const requestBody = {
        email: formData.email,
        password: formData.password,
      };

      const requestHeaders = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      };

      // Request'i konsola yazdır
      console.log("Login API Request:", {
        url: `${API_BASE_URL}/auth/login`,
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
      });

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Response'u text olarak al, sonra JSON'a çevirmeye çalış
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // JSON değilse, text olarak kullan
        data = { message: responseText };
      }

      // Response'u konsola yazdır
      console.log("Login API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse: responseText,
        parsedData: data,
      });

      if (response.ok) {
        // Login başarılı, link doğrulama ekranına geç
        setVerifyData({
          email: formData.email,
          link: "",
        });
        setStep(2);
      } else {
        setError(
          data.message || responseText || "Giriş işlemi başarısız oldu!"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          email: verifyData.email,
          password: formData.password,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { message: responseText };
      }

      if (response.ok) {
        alert("Doğrulama linki tekrar gönderildi!");
      } else {
        setError(data.message || "Link gönderilemedi. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Resend link error:", error);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Link'ten token veya verification code'u çıkar
      const link = verifyData.link.trim();
      let token = null;
      
      // Link formatına göre işlem yap
      try {
        // Tam URL ise
        if (link.startsWith("http://") || link.startsWith("https://")) {
          const url = new URL(link);
          token = url.searchParams.get("token") || url.searchParams.get("code") || url.searchParams.get("verification");
        } else if (link.includes("?")) {
          // Sadece query string varsa
          const url = new URL("http://dummy.com?" + link.split("?")[1]);
          token = url.searchParams.get("token") || url.searchParams.get("code") || url.searchParams.get("verification");
        } else {
          // Direkt token/code olabilir
          token = link;
        }
      } catch (urlError) {
        // URL parse edilemezse, direkt token olarak kullan
        token = link;
      }
      
      if (!token || token.length === 0) {
        setError("Geçersiz link formatı! Lütfen e-postanıza gelen tam linki yapıştırın.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          email: verifyData.email,
          code: token,
        }),
      });

      // Response'u text olarak al, sonra JSON'a çevirmeye çalış
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // JSON değilse, text olarak kullan
        data = { message: responseText };
      }

      // Response'u konsola yazdır
      console.log("Verify Login API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse: responseText,
        parsedData: data,
      });

      if (response.ok && data.statusCode === 200) {
        // Doğrulama başarılı, kullanıcıyı giriş yap
        // Response formatı: { statusCode: 200, message: "...", data: { token: "..." } }
        const token = data.data?.token;

        // Token'ı localStorage'a kaydet
        if (token) {
          localStorage.setItem("token", token);
        }

        const userData = {
          id: data.data?.id || Date.now().toString(),
          email: verifyData.email,
          name: data.data?.name || "Kullanıcı",
          token: token,
          refreshToken: data.data?.refreshToken,
          coldStart:
            data.data?.coldStart !== undefined ? data.data.coldStart : true,
        };
        login(userData);

        // Kullanıcı hesap bilgilerini al
        try {
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
          } catch (e) {
            accountData = { message: accountResponseText };
          }

          // Konsola çıktıyı yazdır
          console.log("User Account API Response:", {
            status: accountResponse.status,
            statusText: accountResponse.statusText,
            headers: Object.fromEntries(accountResponse.headers.entries()),
            rawResponse: accountResponseText,
            parsedData: accountData,
          });

          // Account bilgilerini localStorage'a kaydet
          if (
            accountResponse.ok &&
            accountData.statusCode === 200 &&
            accountData.data
          ) {
            localStorage.setItem(
              "accountData",
              JSON.stringify(accountData.data)
            );

            // UserData'yı account bilgileriyle güncelle
            const updatedUserData = {
              ...userData,
              ...accountData.data,
            };
            login(updatedUserData);

            alert("Giriş ve doğrulama başarılı!");

            // firstLogin true ise kategori seçim sayfasına, değilse ana sayfaya yönlendir
            if (accountData.data.firstLogin === true) {
              navigate("/interests");
            } else {
              navigate("/");
            }
          } else {
            // Account API başarısız olsa bile devam et
            alert("Giriş ve doğrulama başarılı!");
            navigate("/");
          }
        } catch (accountError) {
          console.error("Account API error:", accountError);
          // Hata olsa bile devam et
          alert("Giriş ve doğrulama başarılı!");
          navigate("/");
        }
      } else {
        setError(data.message || responseText || "Doğrulama kodu hatalı!");
      }
    } catch (error) {
      console.error("Verify Login error:", error);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // Kod Doğrulama Ekranı
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo ve Başlık */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Lokum Haber" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              E-posta Doğrulama
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {verifyData.email} adresine gönderilen doğrulama linkini girin
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleVerifyLogin}>
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-red-100">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Email (readonly) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  E-posta Adresi
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    readOnly
                    value={verifyData.email}
                    className="appearance-none relative block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 text-gray-500 rounded-xl sm:text-sm cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              {/* Doğrulama Linki */}
              <div>
                <label
                  htmlFor="link"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Doğrulama Linki
                </label>
                <div className="mt-1">
                  <input
                    id="link"
                    name="link"
                    type="text"
                    required
                    value={verifyData.link}
                    onChange={handleVerifyChange}
                    className="appearance-none relative block w-full px-4 py-3 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                    placeholder="E-postanıza gelen doğrulama linkini yapıştırın"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  E-postanıza gönderilen doğrulama linkini buraya yapıştırın
                </p>
              </div>

              {/* Doğrula Butonu */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "Doğrulanıyor..." : "Doğrula"}
                </button>
              </div>

              {/* Tekrar Yolla Butonu */}
              <div>
                <button
                  type="button"
                  onClick={handleResendLink}
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border-2 border-red-300 text-sm font-semibold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Gönderiliyor..." : "Mail Gelmedi? Tekrar Yolla"}
                </button>
              </div>

              {/* Geri Dön */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  ← Geri Dön
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Login Formu
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo ve Başlık */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Lokum Haber" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            Lokum Haber'e Giriş Yapın
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Hesabınız yok mu?{" "}
            <Link
              to="/register"
              className="font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Kayıt olun
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-red-100">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                E-posta Adresi
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Şifre
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                  placeholder="Şifrenizi girin"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center z-10 hover:text-red-600 cursor-pointer transition-colors focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
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

            {/* Şifremi Unuttum */}
            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  Şifremi unuttum
                </Link>
              </div>
            </div>

            {/* Giriş Butonu */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg
                    className="h-5 w-5 text-red-300 group-hover:text-red-200"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
