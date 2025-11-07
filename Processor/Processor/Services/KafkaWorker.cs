using Confluent.Kafka;
using System.Text.Json;
using Processor.Models;

namespace Processor.Services;

// IHostedService: Bu, uygulamanın arka planda sürekli çalışmasını sağlar
public class KafkaWorker : BackgroundService 
{
    private readonly IConfiguration _config;
    private readonly ILogger<KafkaWorker> _logger;
    private readonly IServiceScopeFactory _scopeFactory; // Service'leri oluşturmak için

    // Builder'da eklediğimiz ayarları al
    private readonly string _consumerTopic;
    private readonly string _producerTopic;
    private readonly string _broker;

    public KafkaWorker(IConfiguration config, 
                       ILogger<KafkaWorker> logger,
                       IServiceScopeFactory scopeFactory)
    {
        _config = config;
        _logger = logger;
        _scopeFactory = scopeFactory;
        
        // appsettings.json'dan ayarları oku
        _broker = _config["Kafka:Broker"]!;
        _consumerTopic = _config["Kafka:ConsumerTopic"]!;
        _producerTopic = _config["Kafka:ProducerTopic"]!;
    }

    // Bu metod, IHostedService'in ana döngüsüdür
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation($"Kafka İşçisi başlatıldı. Dinleniyor: {_consumerTopic}");

        // Consumer ve Producer'ı ayrı thread'lerde başlatalım
        var consumerTask = Task.Run(() => StartConsumer(stoppingToken), stoppingToken);
        // Producer'ı Consumer içinde kullanacağız
        
        return consumerTask;
    }

    private void StartConsumer(CancellationToken stoppingToken)
    {
        // Confluent Kafka'nın Consumer yapılandırması
        var consumerConfig = new ConsumerConfig
        {
            GroupId = _config["Kafka:ConsumerGroup"],
            BootstrapServers = _broker,
            AutoOffsetReset = AutoOffsetReset.Earliest, // Eski mesajları da işlesin
            // Diğer dillerle (Java/Python) iletişim kurduğumuz için
            // Mesajın sadece değerini (Value) alacağız, Key'i String olarak okuyacağız.
            EnableAutoCommit = true 
        };

        // Consumer'ı başlat
        using var consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetKeyDeserializer(Deserializers.Utf8)
            // Value'yu (JSON) şimdilik String olarak al, sonra kendimiz çözelim
            .SetValueDeserializer(Deserializers.Utf8) 
            // Hata loglarını yakala
            .SetErrorHandler((_, e) => _logger.LogError($"Consumer Hatası: {e.Reason}"))
            .Build();

        consumer.Subscribe(_consumerTopic);
        
        // Kapatma sinyali gelene kadar (CTRL+C) dinlemeye devam et
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Mesajı Tüket
                var consumeResult = consumer.Consume(stoppingToken);

                // Java'dan gelen JSON'u ArticleModel'a çevir
                var articleModel = JsonSerializer.Deserialize<ArticleModel>(consumeResult.Message.Value);

                if (articleModel == null || string.IsNullOrEmpty(articleModel.Content))
                {
                    _logger.LogWarning($"Boş veya geçersiz mesaj alındı. Topic: {consumeResult.Topic}");
                    continue;
                }
                
                _logger.LogInformation($"Kafka'dan makale alındı. Kategori: {articleModel.Category}");

                // 2. Mesajı İşle (Özetle)
                // SummarizationService'i scope içinde oluştur (Transient/Scoped servisler için)
                using var scope = _scopeFactory.CreateScope();
                var summarizer = scope.ServiceProvider.GetRequiredService<SummarizationService>();
                
                // Özetle
                articleModel.Summary = summarizer.SummarizeAsync(articleModel.Content).GetAwaiter().GetResult();
                
                _logger.LogInformation($"Makale özetlendi. URL: {articleModel.Url}");


                // 3. Mesajı Yayınla (AI-Enrichment'a yolla)
                ProduceMessage(articleModel);
            }
            catch (OperationCanceledException)
            {
                // Normal kapatma
                break;
            }
            catch (JsonException e)
            {
                _logger.LogError($"JSON Çözümleme Hatası: {e.Message}");
                // Hatalı kaydı atla ve devam et
                continue; 
            }
            catch (ConsumeException e)
            {
                // 'e.Context' referansı bulunamadığı için bu kısmı düzeltiyoruz.
                // En güvenli yöntem, sadece hata sebebini ve eğer varsa Topic/Partition bilgisini loglamaktır.
                var recordInfo = e.ConsumerRecord != null 
                    ? $"Topic: {e.ConsumerRecord.Topic}, Offset: {e.ConsumerRecord.Offset.Value}" 
                    : "Konum Bilinmiyor.";

                _logger.LogError($"Tüketici Hatası: {e.Error.Reason}. Konum: {recordInfo}");
                // Hatalı kaydı atla ve devam et
                continue;
            }
        }
    }

    private void ProduceMessage(ArticleModel article)
    {
        // Confluent Kafka'nın Producer yapılandırması
        var producerConfig = new ProducerConfig { BootstrapServers = _broker };
        
        using var producer = new ProducerBuilder<string, string>(producerConfig)
            .SetKeySerializer(Serializers.Utf8)
            .SetValueSerializer(Serializers.Utf8)
            .SetErrorHandler((_, e) => _logger.LogError($"Producer Hatası: {e.Reason}"))
            .Build();

        // C#'tan Python'a giden nihai JSON
        var jsonMessage = JsonSerializer.Serialize(article);
        
        // Haberin URL'ini Key yapalım (Benzersizlik için)
        var message = new Message<string, string> 
        { 
            Key = article.Url, 
            Value = jsonMessage 
        };
        
        try
        {
            // Gönder ve bekle
            producer.ProduceAsync(_producerTopic, message).GetAwaiter().GetResult();
            _logger.LogInformation($"Makale (URL: {article.Url}) başarıyla {producer.Name} topic'ine yollandı.");
        }
        catch (ProduceException<string, string> e)
        {
            _logger.LogError($"Yayınlama Hatası: {e.Error.Reason}");
        }
    }
}