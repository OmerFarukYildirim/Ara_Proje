# --- AŞAMA 1: Build (Derleme) ---
# Go'nun 'alpine' (küçük) sürümünü kullanarak kodumuzu derleyeceğiz
FROM golang:1.23-alpine AS builder

# Proje dizinini ayarla
WORKDIR /app

# Önce 'go mod' dosyalarını kopyala ve bağımlılıkları indir
# Bu, her kod değişikliğinde 'go mod'u tekrar indirmeyi engeller (cache)
COPY go.mod go.sum ./
RUN go mod download

# Tüm kaynak kodunu kopyala
COPY . .

# Projeyi 'CGO_ENABLED=0' ile (statik) derle
# Bu, 'alpine' gibi en basit 'scratch' imajlarda çalışmasını sağlar
RUN CGO_ENABLED=0 go build -o /app/recommender-service .

# --- AŞAMA 2: Final (Çalıştırma) ---
# 'scratch' (boş imaj) veya 'alpine' (çok küçük Linux) kullanabiliriz
# 'alpine' daha esnektir (örn: 'ping' atabilirsin)
FROM alpine:latest

# Çalışma dizini
WORKDIR /app

# Sadece derlenmiş olan 'recommender-service' dosyasını kopyala
COPY --from=builder /app/recommender-service .

# (Eğer .env dosyasına ihtiyacın varsa, buraya kopyalayabilirsin
# ama bunu 'docker-compose'da 'environment' ile yapmak daha iyidir)

# Servisi çalıştır
# Container başladığında bu komut tetiklenecek
ENTRYPOINT ["/app/recommender-service"]