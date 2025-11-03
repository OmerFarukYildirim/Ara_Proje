// Models.cs (Yeni bir dosya oluştur)
using System.Text.Json.Serialization;

namespace Processor;

// Bu, Python'daki ArticleInput/ArticleEnriched'e uyan C# sınıfımızdır
public class ArticleModel
{
    [JsonPropertyName("id")]
    public string? Id { get; set; } // AI-Enrichment'ta eklenecek ama C# şimdiden bilsin

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    // AI-Enrichment'ın ekleyeceği alanlar (şimdilik null olacaklar)
    [JsonPropertyName("sentiment_label")]
    public string? SentimentLabel { get; set; }

    [JsonPropertyName("sentiment_score")]
    public double? SentimentScore { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("entities")]
    public List<object> Entities { get; set; } = new(); // Şimdilik 'object' dememiz yeterli

    // C#'ın ekleyeceği YENİ ALAN
    [JsonPropertyName("summary")]
    public string? Summary { get; set; }
}

// HF'den gelen yanıtı yakalamak için
public class HfSummaryResponse
{
    [JsonPropertyName("summary_text")]
    public string? SummaryText { get; set; }
}