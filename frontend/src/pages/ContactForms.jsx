import React, { useState, useEffect } from "react";
import { API_KEY, API_BASE_URL } from "../config/api";

function ContactForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

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
          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">İletişim Formları</h1>
            <p className="text-black">Gönderilen tüm formların listesi</p>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Form Listesi */}
          {forms.length === 0 ? (
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
              <p className="mt-4 text-gray-600">Henüz form bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form, index) => (
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

