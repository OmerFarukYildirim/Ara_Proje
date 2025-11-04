# --- AŞAMA 1: Build (Derleme) ---
# .NET SDK'sını kullan (7.0 veya 8.0 kullanabilirsin)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# .csproj dosyasının 'Processor' adında bir alt klasörde olduğunu varsayıyoruz
# Eğer değilse, "Processor/" kısımlarını silmen gerekir.
COPY Processor/Processor.csproj ./Processor/
RUN dotnet restore "Processor/Processor.csproj"

# Kalan tüm kodları kopyala
COPY . .

# 'publish' komutunu da proje dosyasını belirterek çalıştır
RUN dotnet publish "Processor/Processor.csproj" -c Release -o /app/publish

# --- AŞAMA 2: Final (Çalıştırma) ---
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Proje adın 'Processor' ise DLL adı da 'Processor.dll' olmalı
ENTRYPOINT ["dotnet", "Processor.dll"]