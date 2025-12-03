# --- 1. Aşama: Build (Maven) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Önce pom.xml'i kopyalayıp bağımlılıkları indir (Cache avantajı için)
COPY pom.xml .
# Bağımlılıkları indir (Offline moda hazırlar)
RUN mvn dependency:go-offline -B

# Kaynak kodları kopyala ve projeyi derle
COPY src ./src
RUN mvn clean package -DskipTests

# --- 2. Aşama: Runtime (Java) ---
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app

# Build aşamasından çıkan JAR dosyasını al
# (target klasöründeki jar isminin app.jar olduğunu varsayıyoruz, değilse pom.xml'e finalName ekle veya * kullan)
COPY --from=build /app/target/*.jar app.jar

# Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "app.jar"]
