# Python 3.10'un 'slim' (ince) sürümünü kullan
FROM python:3.10-slim

WORKDIR /app

# Önce bağımlılık dosyasını kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tüm kaynak kodunu kopyala
COPY . .

# Servisi çalıştır (Uvicorn kullandığını varsayarak)
# 'main.py' dosyasındaki 'app' objesini 8000 portunda başlat
# 0.0.0.0, Docker'ın dışarıdan erişebilmesi için şarttır
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]