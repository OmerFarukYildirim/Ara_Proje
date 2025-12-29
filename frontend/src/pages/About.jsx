import React from "react";

function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="Lokum Haber" 
                className="h-32 w-32 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Hakkımızda</h1>
            <p className="text-lg text-gray-600">
              Lokum Haber - Türkiye'nin Güvenilir Haber Kaynağı
            </p>
          </div>
          <div className="space-y-6 text-gray-700">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Biz Kimiz?</h2>
              <p className="text-lg leading-relaxed">
                Lokum Haber, Türkiye'nin köklü ve güvenilir haber platformlarından biridir. 
                Yılların deneyimi ve geleneksel gazetecilik değerlerini modern teknolojiyle 
                buluşturarak, okuyucularımıza en kaliteli haber deneyimini sunmayı hedefliyoruz.
              </p>
              <p className="text-lg leading-relaxed">
                Adımızın "Lokum" olması tesadüf değil. Tıpkı Türk lokumunun yüzyıllardır 
                nesillerden nesillere aktarılan geleneksel bir lezzet olması gibi, biz de 
                haberlerimizi titizlikle hazırlayıp, doğruluğunu ve güvenilirliğini koruyarak 
                sizlere sunuyoruz. Her bir haberimiz, tıpkı lokumun her bir parçası gibi, 
                özenle seçilmiş ve işlenmiş içeriklerden oluşur.
              </p>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Misyonumuz</h2>
              <p className="text-lg leading-relaxed">
                Lokum Haber olarak, tarafsız, objektif ve doğru habercilik ilkelerinden 
                ödün vermeden, okuyucularımıza en güncel ve önemli haberleri ulaştırmayı 
                misyon edindik. Teknoloji, spor, sağlık, ekonomi, kültür-sanat ve daha 
                birçok alanda kapsamlı haberler sunarak, okuyucularımızın bilgiye kolayca 
                erişmesini sağlıyoruz.
              </p>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Vizyonumuz</h2>
              <p className="text-lg leading-relaxed">
                Modern dünyanın hızlı temposuna uyum sağlarken, Instagram Reels tarzında 
                akıcı ve kullanıcı dostu bir arayüzle haberleri sunuyoruz. Kişiselleştirilmiş 
                içerik önerileri sayesinde, her okuyucumuz kendi ilgi alanlarına göre 
                özelleştirilmiş bir haber deneyimi yaşar. Gelecekte de Türkiye'nin en 
                güvenilir ve sevilen haber platformlarından biri olmaya devam etmek 
                hedefindeyiz.
              </p>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Değerlerimiz</h2>
              <ul className="list-disc list-inside space-y-2 text-lg leading-relaxed">
                <li><strong>Doğruluk:</strong> Her haberimiz titizlikle araştırılır ve doğrulanır</li>
                <li><strong>Tarafsızlık:</strong> Objektif habercilik ilkelerinden asla ödün vermeyiz</li>
                <li><strong>Güvenilirlik:</strong> Yılların deneyimiyle oluşturduğumuz güvenilirlik</li>
                <li><strong>İnovasyon:</strong> Modern teknolojiyi geleneksel değerlerle harmanlıyoruz</li>
                <li><strong>Okuyucu Odaklılık:</strong> Her kararımızda okuyucularımızı ön planda tutuyoruz</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
