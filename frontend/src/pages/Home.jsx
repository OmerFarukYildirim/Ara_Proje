import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_KEY, API_BASE_URL } from "../config/api";

function Home() {
  const { user } = useAuth();
  const [accountData, setAccountData] = useState(null);
  
  useEffect(() => {
    // Account bilgilerini yükle
    const loadAccountData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const cachedAccountData = localStorage.getItem("accountData");
        if (cachedAccountData) {
          try {
            const parsed = JSON.parse(cachedAccountData);
            setAccountData(parsed);
          } catch (error) {
            console.error("Error parsing cached account data:", error);
          }
        }

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
        }
      } catch (error) {
        console.error("Error loading account data:", error);
      }
    };

    loadAccountData();
  }, []);

  // Kullanıcı adını al
  const userInfo = accountData || user || {};
  const userName = userInfo.firstName || userInfo.name?.split(" ")[0] || "Kullanıcı";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Kişisel Karşılama */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Lokum Haber" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Lokum Haber'e Hoş Geldin {userName}
          </h1>
        </div>

        {/* Biz Kimiz Bölümü */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-red-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Biz Kimiz?</h2>
          <p className="text-gray-700 leading-relaxed">
            Lokum Haber, Türkiye'nin köklü ve güvenilir haber platformlarından biridir. 
            Yılların deneyimi ve geleneksel gazetecilik değerlerini modern teknolojiyle 
            buluşturarak, okuyucularımıza en kaliteli haber deneyimini sunmayı hedefliyoruz. 
            Tıpkı Türk lokumunun yüzyıllardır nesillerden nesillere aktarılan geleneksel bir 
            lezzet olması gibi, biz de haberlerimizi titizlikle hazırlayıp, doğruluğunu ve 
            güvenilirliğini koruyarak sizlere sunuyoruz.
          </p>
        </div>

        {/* Kişisel Haber Akışı Bölümü */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-1 mb-6 md:mb-0 md:mr-8">
              <h2 className="text-3xl font-bold mb-4">Size Özel Kişisel Haber Akışı</h2>
              <p className="text-lg text-red-50 leading-relaxed">
                İlgi alanlarınıza göre özelleştirilmiş, sizin için seçilmiş haberleri 
                Instagram Reels tarzında akıcı bir deneyimle keşfedin. Her haber, 
                sizin tercihlerinize göre kişiselleştirilmiş olarak sunulur.
              </p>
            </div>
            <Link
              to="/news"
              className="px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              Haberlere Git →
            </Link>
          </div>
        </div>

        {/* Amacımız Bölümü */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
          <h3 className="text-xl font-bold text-gray-800 mb-3">Amacımız</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            Tarafsız, objektif ve doğru habercilik ilkelerinden ödün vermeden, 
            okuyucularımıza en güncel ve önemli haberleri ulaştırmak. Modern dünyanın 
            hızlı temposuna uyum sağlarken, geleneksel gazetecilik değerlerini koruyarak 
            Türkiye'nin en güvenilir haber kaynağı olmak.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
