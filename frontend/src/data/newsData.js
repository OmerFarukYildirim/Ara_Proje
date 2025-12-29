// Mock haber verileri
export const newsData = [
  {
    id: 1,
    title: "Teknoloji Dünyasında Büyük Gelişme",
    content:
      "Yapay zeka teknolojilerinde yaşanan son gelişmeler, gelecekteki iş dünyasını köklü şekilde değiştirecek. Uzmanlar, bu teknolojinin 5 yıl içinde milyonlarca iş kolunu etkileyeceğini öngörüyor.",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop",
    category: "Teknoloji",
    author: "Ahmet Yılmaz",
    publishDate: "2024-01-15",
    readTime: "3 dk",
    likes: 1247,
    dislikes: 23,
    comments: 89,
    shares: 156,
  },
  {
    id: 2,
    title: "Ekonomide Yeni Trendler",
    content:
      "Kripto para piyasalarında yaşanan dalgalanmalar, yatırımcıları alternatif yatırım araçlarına yönlendiriyor. Uzmanlar, sürdürülebilir yatırım stratejilerinin önemini vurguluyor.",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
    category: "Ekonomi",
    author: "Fatma Demir",
    publishDate: "2024-01-14",
    readTime: "4 dk",
    likes: 892,
    dislikes: 45,
    comments: 67,
    shares: 134,
  },
  {
    id: 3,
    title: "Sağlık Alanında Çığır Açan Buluş",
    content:
      "Bilim insanları, kanser tedavisinde kullanılan yeni bir yöntem geliştirdi. Bu yöntem, hastaların yaşam kalitesini artırırken tedavi sürecini de hızlandırıyor.",
    image:
      "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    category: "Sağlık",
    author: "Dr. Mehmet Kaya",
    publishDate: "2024-01-13",
    readTime: "5 dk",
    likes: 2156,
    dislikes: 12,
    comments: 145,
    shares: 289,
  },
  {
    id: 4,
    title: "Spor Dünyasından Son Dakika",
    content:
      "Futbol transfer döneminde büyük sürprizler yaşanıyor. Yıldız oyuncuların yeni takımlarına geçişi, taraftarları heyecanlandırıyor.",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "Spor",
    author: "Can Özkan",
    publishDate: "2024-01-12",
    readTime: "2 dk",
    likes: 1876,
    dislikes: 67,
    comments: 234,
    shares: 445,
  },
  {
    id: 5,
    title: "Çevre Dostu Enerji Çözümleri",
    content:
      "Güneş enerjisi teknolojilerindeki gelişmeler, temiz enerji üretimini artırıyor. Bu sayede karbon ayak izi azalırken enerji maliyetleri de düşüyor.",
    image:
      "https://images.unsplash.com/photo-1466611653911-95e320c8c024?w=800&h=600&fit=crop",
    category: "Çevre",
    author: "Elif Şahin",
    publishDate: "2024-01-11",
    readTime: "4 dk",
    likes: 1456,
    dislikes: 34,
    comments: 98,
    shares: 167,
  },
  {
    id: 6,
    title: "Eğitimde Dijital Dönüşüm",
    content:
      "Online eğitim platformları, geleneksel eğitim sistemini köklü şekilde değiştiriyor. Öğrenciler artık daha esnek ve kişiselleştirilmiş eğitim deneyimi yaşıyor.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    category: "Eğitim",
    author: "Prof. Dr. Ayşe Yıldız",
    publishDate: "2024-01-10",
    readTime: "6 dk",
    likes: 987,
    dislikes: 56,
    comments: 76,
    shares: 123,
  },
];

export const categories = [
  { id: "all", name: "Tümü", color: "bg-gray-500" },
  { id: "technology", name: "Teknoloji", color: "bg-blue-500" },
  { id: "economy", name: "Ekonomi", color: "bg-green-500" },
  { id: "health", name: "Sağlık", color: "bg-red-500" },
  { id: "sports", name: "Spor", color: "bg-orange-500" },
  { id: "environment", name: "Çevre", color: "bg-emerald-500" },
  { id: "education", name: "Eğitim", color: "bg-purple-500" },
];
