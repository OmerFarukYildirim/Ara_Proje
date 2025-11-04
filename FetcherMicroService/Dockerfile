FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Önce 'pom.xml'i kopyala ve bağımlılıkları indir
COPY pom.xml .
RUN mvn dependency:go-offline

# Tüm kaynak kodunu kopyala
COPY src ./src

# Projeyi paketle (.jar oluştur), testleri atla
RUN mvn clean package -DskipTests

# --- DEBUG ADIMI ---
# Build bittikten sonra /app/target klasöründe ne var, terminalde göster
RUN echo "--- /app/target klasörünün içeriği: ---" && ls -l /app/target
RUN echo "---------------------------------------"

# --- AŞAMA 2: Final (Çalıştırma) ---
# Sadece Java Runtime (JRE) içeren küçük 'alpine' imajını kullan
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 'builder' aşamasında oluşturulan .jar dosyasını kopyala
COPY --from=builder /app/target/*.jar app.app.jar

# (Port 8080'i açığa çıkar, 'docker-compose' bunu zaten yapacak)
# EXPOSE 8080

# Uygulamayı çalıştır
ENTRYPOINT ["java", "-jar", "/app/app.app.jar"]