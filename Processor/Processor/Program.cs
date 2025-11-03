
using Processor.Services; // Kendi servislerimizi ekliyoruz
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 1. Hugging Face için HttpClient (Token'ı ayarlar)
var hfApiKey = builder.Configuration["HuggingFace:ApiKey"];
builder.Services.AddHttpClient("HuggingFace", client =>
{
    client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", hfApiKey);
});

// 2. AI-Enrichment'a paslamak için HttpClient (Base URL'i ayarlar)
var aiUrl = builder.Configuration["AiEnrichment:Url"];
builder.Services.AddHttpClient("AiEnrichment", client =>
{
    client.BaseAddress = new Uri(aiUrl!);
});

// 3. Özetleme Servisimizi 'Scoped' olarak ekle
builder.Services.AddScoped<SummarizationService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseAuthorization();
app.MapControllers(); // Controller'ları aktif et
app.Run();