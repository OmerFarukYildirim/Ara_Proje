using Processor.Services;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// WebApplication yerine Host (Arka plan işçisi) kullan
var builder = Host.CreateApplicationBuilder(args);

// 1. Özetleme Servisimizi 'Scoped' olarak ekle
builder.Services.AddScoped<SummarizationService>();

// 2. Kafka Worker (İşçi) Servisimizi ekle
builder.Services.AddHostedService<KafkaWorker>();


// --- HttpClient Ayarları (HuggingFace için aynı kalır) ---

// IHttpClientFactory ekle
builder.Services.AddHttpClient(); 

// 1. Hugging Face için HttpClient (Token'ı ayarlar)
var hfApiKey = builder.Configuration["HuggingFace:ApiKey"];
builder.Services.AddHttpClient("HuggingFace", client =>
{
    // API Key'i auth header'a ekle
    client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", hfApiKey);
});

// Artık Controller'lar, Swagger, Authorization gibi şeylere GEREK YOK.
// builder.Services.AddControllers(); // KALDIRILDI
// builder.Services.AddEndpointsApiExplorer(); // KALDIRILDI
// builder.Services.AddSwaggerGen(); // KALDIRILDI

var app = builder.Build();
await app.RunAsync();