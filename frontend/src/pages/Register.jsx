import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL, API_KEY } from "../config/api";

function Register() {
  const [step, setStep] = useState(1); // 1: Register, 2: Verify
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [verifyData, setVerifyData] = useState({
    email: "",
    link: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Şifre kontrolü
    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor!");
      return;
    }

    // Şifre validasyonu: En az 8 karakter, 1 büyük harf, 1 sayı, 1 özel karakter (@#$%^&+=!)
    if (formData.password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır!");
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Şifre en az 1 büyük harf içermelidir!");
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Şifre en az 1 rakam içermelidir!");
      return;
    }
    if (!/[@#$%^&+=!]/.test(formData.password)) {
      setError("Lütfen geçerli karakterlerden birini kullan (@#$%^&+=!)");
      return;
    }

    // Şartları kabul etme kontrolü
    if (!formData.agreeTerms) {
      setError("Kullanım şartlarını kabul etmelisiniz!");
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      };

      const requestHeaders = {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      };

      // Request'i konsola yazdır
      console.log("Register API Request:", {
        url: `${API_BASE_URL}/auth/register`,
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
      });

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      // Response'u text olarak al, sonra JSON'a çevirmeye çalış
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        // JSON değilse, text olarak kullan
        data = { message: responseText };
      }

      // Response'u konsola yazdır
      console.log("Register API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse: responseText,
        parsedData: data,
      });

      if (response.ok) {
        // Kayıt başarılı, link doğrulama ekranına geç
        setVerifyData({
          email: formData.email,
          link: "",
        });
        setStep(2);
      } else {
        // Backend'den gelen hata mesajını kontrol et (hem JSON hem text)
        let errorMessage = data.message || data.error || responseText || "Kayıt işlemi başarısız oldu!";
        const errorMessageLower = errorMessage.toLowerCase();
        
        // E-posta zaten kayıtlı hatası kontrolü (tüm olası formatlar)
        if (errorMessageLower.includes("duplicate key") || 
            errorMessageLower.includes("already exists") ||
            errorMessageLower.includes("uk18p06wterj5o406gllafcs2pu") ||
            (errorMessageLower.includes("email") && errorMessageLower.includes("exists")) ||
            errorMessageLower.includes("unique constraint") ||
            (errorMessageLower.includes("email") && errorMessageLower.includes("duplicate"))) {
          errorMessage = "Bu e-posta adresi zaten kayıtlı. Lütfen farklı bir e-posta adresi kullanın veya giriş yapın.";
        }
        // Şifre validasyon hatası kontrolü
        else if (errorMessageLower.includes("şifre en az 8 karakter olmalı") || 
            errorMessageLower.includes("password") ||
            errorMessageLower.includes("pattern") ||
            errorMessageLower.includes("validation failed")) {
          errorMessage = "Lütfen geçerli karakterlerden birini kullan (@#$%^&+=!)";
        }
        // Genel SQL hatası
        else if (errorMessageLower.includes("sql") || errorMessageLower.includes("constraint")) {
          // E-posta ile ilgili constraint hatası
          if (errorMessageLower.includes("email")) {
            errorMessage = "Bu e-posta adresi zaten kayıtlı. Lütfen farklı bir e-posta adresi kullanın.";
          } else {
            errorMessage = "Kayıt işlemi sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
          }
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error("Register error:", error);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          name: formData.name,
          surname: formData.surname,
          email: verifyData.email,
          phoneNumber: formData.phoneNumber,
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

  const handleVerify = async (e) => {
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

      const response = await fetch(`${API_BASE_URL}/auth/verifyReg`, {
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
      console.log("Verify Registration API Response:", {
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
          name: `${formData.name} ${formData.surname}`,
          token: token,
          refreshToken: data.data?.refreshToken,
        };
        login(userData);

        // Kullanıcı hesap bilgilerini al
        try {
          const accountResponse = await fetch(`${API_BASE_URL}/users/account`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "x-api-key": API_KEY,
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

            alert("Kayıt ve doğrulama başarılı!");

            // firstLogin true ise kategori seçim sayfasına, değilse ana sayfaya yönlendir
            if (accountData.data.firstLogin === true) {
              navigate("/interests");
            } else {
              navigate("/");
            }
          } else {
            // Account API başarısız olsa bile devam et
            alert("Kayıt ve doğrulama başarılı!");
            navigate("/");
          }
        } catch (accountError) {
          console.error("Account API error:", accountError);
          // Hata olsa bile devam et
          alert("Kayıt ve doğrulama başarılı!");
          navigate("/");
        }
      } else {
        setError(data.message || responseText || "Doğrulama kodu hatalı!");
      }
    } catch (error) {
      console.error("Verify error:", error);
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
          <form className="mt-8 space-y-6" onSubmit={handleVerify}>
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

  // Kayıt Formu
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
            Lokum Haber'e Katılın
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Zaten hesabınız var mı?{" "}
            <Link
              to="/login"
              className="font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Giriş yapın
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-red-100">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Ad ve Soyad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Ad
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                    placeholder="Adınız"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="surname"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Soyad
                </label>
                <div className="mt-1">
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.surname}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-4 py-3 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                    placeholder="Soyadınız"
                  />
                </div>
              </div>
            </div>

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
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>

            {/* Telefon Numarası */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Telefon Numarası
              </label>
              <div className="mt-1">
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                  placeholder="5XXXXXXXXX"
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                  placeholder="Şifrenizi oluşturun"
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

            {/* Şifre Tekrar */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Şifre Tekrar
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm transition-all"
                  placeholder="Şifrenizi tekrar girin"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center z-10 hover:text-red-600 cursor-pointer transition-colors focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  aria-label={showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showConfirmPassword ? (
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

            {/* Şifre Güvenlik İpuçları */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
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

            {/* Kullanım Şartları */}
            <div className="flex items-center">
              <input
                id="agreeTerms"
                name="agreeTerms"
                type="checkbox"
                required
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label
                htmlFor="agreeTerms"
                className="ml-2 block text-sm text-gray-900"
              >
                <a href="#" className="text-red-600 hover:text-red-700 transition-colors">
                  Kullanım şartlarını
                </a>{" "}
                ve{" "}
                <a href="#" className="text-red-600 hover:text-red-700 transition-colors">
                  gizlilik politikasını
                </a>{" "}
                kabul ediyorum
              </label>
            </div>

            {/* Kayıt Butonu */}
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
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {loading ? "Kayıt yapılıyor..." : "Hesap Oluştur"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
