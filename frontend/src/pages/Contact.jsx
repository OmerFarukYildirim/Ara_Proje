import React, { useState } from "react";
import { API_KEY, API_BASE_URL } from "../config/api";

function Contact() {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    email: "",
    topic: "",
    content: "",
  });
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Form validasyonu
    if (!formData.phoneNumber || !formData.email || !formData.topic || !formData.content) {
      alert("Lütfen tüm alanları doldurun!");
      setLoading(false);
      return;
    }

    // E-posta format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Lütfen geçerli bir e-posta adresi girin!");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      console.log("Create Form API Request:", {
        url: `${API_BASE_URL}/users/createForm`,
        method: "POST",
        body: formData,
      });

      const response = await fetch(`${API_BASE_URL}/users/createForm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      console.log("Create Form API Response:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      if (response.ok) {
        setShowNotification(true);
        setFormData({
          phoneNumber: "",
          email: "",
          topic: "",
          content: "",
        });

        // 5 saniye sonra bildirimi kapat
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      } else {
        alert(responseData.message || "Form gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Create Form error:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-rose-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Başarı Bildirimi */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 border-2 border-green-500 flex items-center space-x-4 min-w-[320px] max-w-md">
              <div className="shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
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
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Talebiniz Alındı! 🎉</h3>
                <p className="text-sm text-gray-600 mt-1">
                  En kısa sürede size dönüş yapacağız.
                </p>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100 mb-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="Lokum Haber" 
                className="h-24 w-24 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">İletişim</h1>
            <p className="text-lg text-gray-600">Lokum Haber ile iletişime geçin</p>
          </div>

          {/* Destek Talebi Formu */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Destek Talebi Oluştur
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Telefon */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Telefon Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-black"
                    placeholder="5XXXXXXXXX"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    E-posta Adresi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-black"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              {/* Konu */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Konu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-black"
                  placeholder="Konu başlığı"
                />
              </div>

              {/* Açıklama */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Açıklama <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none text-black"
                  placeholder="Lütfen talebinizi detaylı bir şekilde açıklayın..."
                />
              </div>

              {/* Gönder Butonu */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Gönderiliyor...
                    </span>
                  ) : (
                    "Gönder"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* E-posta Adresleri */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Doğrudan E-posta Gönderin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors cursor-pointer">
                <p className="text-sm text-gray-600 mb-1">E-posta</p>
                <a 
                  href="mailto:muhammik1234@gmail.com"
                  className="text-lg font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  muhammik1234@gmail.com
                </a>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer">
                <p className="text-sm text-gray-600 mb-1">E-posta</p>
                <a 
                  href="mailto:muhammedikbalcmp@gmail.com"
                  className="text-lg font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  muhammedikbalcmp@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animasyonu için stil */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Contact;
