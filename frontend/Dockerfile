# --- Aşama 1: Build (Node.js) ---
FROM node:18-alpine as build-stage

WORKDIR /app

# Önce bağımlılıkları kopyala ve yükle (Cache optimizasyonu için)
COPY package*.json ./
RUN npm install

# Tüm kaynak kodları kopyala
COPY . .

# Vite ile build al (Bu işlem /app/dist klasörünü oluşturacak)
RUN npm run build

# --- Aşama 2: Serve (Nginx) ---
FROM nginx:stable-alpine as production-stage

# React Router için Nginx Ayarı:
# Kullanıcı sayfayı yenilediğinde 404 hatası almaması için
# tüm istekleri index.html'e yönlendiriyoruz.
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Build aşamasından çıkan 'dist' klasörünü Nginx'e kopyala
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
