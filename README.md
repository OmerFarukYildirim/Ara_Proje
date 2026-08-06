# Ara Proje — AI Destekli Haber & İçerik Platformu

> Mikroservis mimarisi, event-driven Kafka pipeline'ı ve yapay zeka entegrasyonu ile çalışan modern bir haber toplama, zenginleştirme ve öneri sistemi.

---

## 📋 İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Mimari Genel Bakış](#mimari-genel-bakış)
- [Teknolojiler](#teknolojiler)
- [Mikroservisler](#mikroservisler)
- [Veri Akışı (Pipeline)](#veri-akışı-pipeline)
- [Kurulum](#kurulum)
  - [Gereksinimler](#gereksinimler)
  - [Docker Compose ile Çalıştırma](#docker-compose-ile-çalıştırma)
  - [Kubernetes (k3s) ile Çalıştırma](#kubernetes-k3s-ile-çalıştırma)
- [API ve Port Haritası](#api-ve-port-haritası)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Ekran Görüntüleri](#ekran-görüntüleri)
- [Katkıda Bulunma](#katkıda-bulunma)
- [Lisans](#lisans)

---

## 🎯 Proje Hakkında

**Ara Proje**, kullanıcıların kişiselleştirilmiş haber ve içerik akışına erişmesini sağlayan, mikroservis tabanlı bir platformdur. Sistem, harici haber kaynaklarından içerik toplar, yapay zeka ile zenginleştirir, özetler ve kullanıcı davranışlarına göre kişiselleştirilmiş öneriler sunar.

### Temel Özellikler

- 🔐 **Kimlik Doğrulama & Yetkilendirme** — JWT tabanlı güvenli giriş sistemi
- 📰 **Haber Toplama** — NewsData API ve harici kaynaklardan otomatik haber çekme
- 🤖 **AI Zenginleştirme** — Google Gemini API ile haber içeriklerini zenginleştirme
- 📝 **Otomatik Özetleme** — HuggingFace BART-Large-CNN modeli ile haber özetleme
- 🔍 **Arama & İndeksleme** — Elasticsearch ile tam metin arama
- 🎯 **Kişiselleştirilmiş Öneriler** — Kullanıcı etkileşimlerine dayalı içerik öneri motoru
- ⚡ **Yüksek Performans** — Redis önbellekleme ve Kafka asenkron mesajlaşma
- 🐳 **Konteynerizasyon** — Docker ve Kubernetes (k3s) desteği

---

## 🏗️ Mimari Genel Bakış

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Content Finder │────▶│     Kafka       │
│   (React/Vite)  │     │  (Python/FastAPI)│     │   (Zookeeper)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┼──────────────────────────┐
                              │                          │                          │
                              ▼                          ▼                          ▼
                    ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
                    │  Fetcher Service │        │ Content Mixer   │        │  Recommender    │
                    │ (Java/Spring Boot)│       │ (Java/Spring Boot)│      │    (Go)         │
                    └────────┬────────┘        └─────────────────┘        └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Kafka       │
                    │ haber_zenginlestirme_topic
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Processor    │
                    │  (.NET Core/C#) │
                    │  HuggingFace    │
                    │  BART Özetleme  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Kafka       │
                    │  haber_isleme_topic
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  AI Enrichment  │
                    │ (Python/FastAPI)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Elasticsearch   │
                    └─────────────────┘

┌─────────────────┐
│   Auth Service  │
│ (Java/Spring)   │
└─────────────────┘
```

---

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React, Vite |
| **Backend (Java)** | Spring Boot, Spring Kafka, Spring Data JPA |
| **Backend (Python)** | FastAPI, Uvicorn, Kafka-Python, Elasticsearch-DSL |
| **Backend (.NET)** | .NET Core, Confluent.Kafka |
| **Backend (Go)** | Go, Gin/Echo, GORM |
| **Veritabanı** | PostgreSQL (3 ayrı instance) |
| **Önbellek** | Redis |
| **Arama Motoru** | Elasticsearch |
| **Mesajlaşma** | Apache Kafka, Zookeeper |
| **AI/ML API'leri** | Google Gemini API, HuggingFace Inference API, NewsData API |
| **Bulut Depolama** | AWS S3 |
| **Konteynerizasyon** | Docker, Docker Compose |
| **Orkestrasyon** | Kubernetes (k3s) |
| **Güvenlik** | JWT, API Key |

---

## 🧩 Mikroservisler

| Servis | Dil/Framework | Port | Açıklama |
|--------|--------------|------|----------|
| **AuthMikroService** | Java / Spring Boot | `8090` | Kullanıcı kayıt/giriş, JWT yönetimi, e-posta doğrulama, AWS S3 entegrasyonu |
| **FetcherMicroService** | Java / Spring Boot | `8091` | Harici API'lerden haber çekme, Google Gemini ile içerik zenginleştirme |
| **Processor** | .NET Core / C# | `8003` | HuggingFace BART modeli ile haber özetleme |
| **AI Enrichment** | Python / FastAPI | `8000` | İşlenmiş haberleri Elasticsearch'e indeksleme |
| **Content Finder** | Python / FastAPI | `8001` | Haber talebi yönetimi, NewsData API entegrasyonu, kullanıcı okuma geçmişi |
| **Content Mixer** | Java / Spring Boot | `8092` | Farklı kaynaklardan gelen haberleri karıştırma ve düzenleme |
| **Recommender** | Go | `8004` | Kullanıcı davranışlarına göre kişiselleştirilmiş içerik önerileri |
| **Frontend** | React / Vite | — | Kullanıcı arayüzü |

---

## 🔄 Veri Akışı (Pipeline)

Sistem, **event-driven** bir mimari ile Kafka topic'leri üzerinden asenkron olarak çalışır:

```
1. content-finder  →  Kafka: haber_talebi_topic
2. fetcher-service →  Kafka: haber_zenginlestirme_topic  (LLM ile zenginleştirme)
3. processor       →  Kafka: haber_isleme_topic           (BART ile özetleme)
4. ai-enrichment   →  Elasticsearch                         (İndeksleme)
5. content-mixer   →  Kafka: mixed-feed-reply-topic         (Haber karıştırma)
6. recommender     →  Kullanıcıya özel öneriler             (Redis + PostgreSQL)
```

**Ek Topic'ler:**
- `onboarding_events` — Yeni kullanıcı kayıt olayları
- `interaction_events` — Kullanıcı etkileşim olayları (tıklama, okuma, beğeni)
- `unmixed-feed-topic` / `mixed-feed-reply-topic` — Content Mixer iletişimi

---

## 🚀 Kurulum

### Gereksinimler

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Java 17+](https://adoptium.net/) (Java servisler için)
- [Python 3.10+](https://www.python.org/downloads/) (Python servisler için)
- [.NET 8 SDK](https://dotnet.microsoft.com/download) (Processor için)
- [Go 1.21+](https://go.dev/dl/) (Recommender için)
- [Node.js 18+](https://nodejs.org/) (Frontend için)

### Docker Compose ile Çalıştırma

Tüm altyapı ve servisleri tek komutla başlatmak için:

```bash
# 1. Repoyu klonlayın
git clone https://github.com/OmerFarukYildirim/Ara_Proje.git
cd Ara_Proje

# 2. .env dosyasını oluşturun (gerekli API anahtarlarını ekleyin)
cp .env.example .env

# 3. Tüm servisleri sıralı olarak başlatın (önerilen)
bash start.sh

# VEYA manuel olarak:
# Altyapı servislerini başlat
docker compose up -d postgres_auth postgres_recommender postgres_userreads
sleep 15
docker compose up -d elasticsearch
sleep 15
docker compose up -d redis_cache
sleep 15
docker compose up -d zookeeper kafka kafka-ui
sleep 15

# Uygulama servislerini başlat
docker compose up -d --build auth-service
docker compose up -d --build recommender-service
docker compose up -d --build fetcher-service
docker compose up -d --build content-finder-service processor-service ai-enrichment-service content-mixer-service
```

### Kubernetes (k3s) ile Çalıştırma

```bash
# 1. k3s kurulumu
bash k3s_kurulum.sh

# 2. Altyapı bileşenlerini deploy edin
kubectl apply -f infrastructure.yaml

# 3. Kafka cluster'ını oluşturun
kubectl apply -f kafka-cluster.yaml
kubectl apply -f kafka-nodepool.yaml
kubectl apply -f kafka-topics.yaml

# 4. Pipeline servislerini deploy edin
kubectl apply -f pipeline-services.yaml

# 5. Core servisleri deploy edin
kubectl apply -f core-services.yaml

# 6. Frontend'i deploy edin
kubectl apply -f frontend/frontend.yaml
```

---

## 🌐 API ve Port Haritası

| Servis | Port | Erişim | Açıklama |
|--------|------|--------|----------|
| Auth Service | `8090` | NodePort `30000` | Kimlik doğrulama API'leri |
| Fetcher Service | `8091` | ClusterIP | Haber çekme & LLM zenginleştirme |
| AI Enrichment | `8000` | ClusterIP | Elasticsearch indeksleme |
| Content Finder | `8001` | NodePort `30002` | Haber talebi & arama |
| Content Mixer | `8092` | ClusterIP | Haber karıştırma |
| Recommender | `8004` | NodePort `30001` | Öneri API'leri |
| Processor | `8003` | ClusterIP | HuggingFace özetleme |
| Kafka UI | `8085` | `localhost:8085` | Kafka yönetim arayüzü |
| Elasticsearch | `9200` | `localhost:9200` | Arama & analitik motoru |
| PostgreSQL | `5432` | ClusterIP | 3 ayrı veritabanı |
| Redis | `6379` | ClusterIP | Önbellek & oturum yönetimi |

---

## 🔧 Ortam Değişkenleri

Aşağıdaki değişkenleri `.env` dosyasında tanımlamanız gerekir:

```env
# Redis
REDIS_PASSWORD=your_redis_password

# NewsData API
NEWSDATA_API_KEY=your_newsdata_api_key

# HuggingFace
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Google Gemini (Fetcher Service)
LLM_API_KEY=your_gemini_api_key

# AWS S3 (Auth Service)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=your_region

# E-posta (Auth Service)
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=your_app_password

# JWT
SECRET_JWT_STRING=your_jwt_secret_key
```

---

## 📸 Ekran Görüntüleri

> *(Ekran görüntüleri eklenecektir)*

---

## 🤝 Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request açın

---

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı altında lisanslanmıştır.

---

## 👤 Geliştirici

**Ömer Faruk Yıldırım**

- GitHub: [@OmerFarukYildirim](https://github.com/OmerFarukYildirim)

---

> 💡 **Not:** Bu proje bir araştırma/öğrenme projesi olarak geliştirilmiştir. Üretim ortamında kullanımdan önce güvenlik, ölçeklenebilirlik ve hata yönetimi konularında ek optimizasyonlar yapılması önerilir.
