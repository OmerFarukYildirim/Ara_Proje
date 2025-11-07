// Models.cs
using System.Text.Json.Serialization;
// C#'ta Topic'ten gelen verinin şekli (Java'daki ArticleDTO'nun karşılığı)
namespace Processor.Models;

public class ArticleModel
{
    // Fetcher'dan (Java) gelen temel alanlar
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("content")]
    public string? Content { get; set; } // Özetlenecek ana metin

    [JsonPropertyName("url")]
    public string? Url { get; set; } // Anahtarımız olacak

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    // C#'ın ekleyeceği YENİ ALAN (Özet)
    [JsonPropertyName("summary")]
    public string? Summary { get; set; }
    
    // Diğer AI alanlarını silebiliriz, Processor kullanmıyor
}

// HF'den gelen yanıtı yakalamak için (Aynı, değişiklik yok)
public class HfSummaryResponse
{
    [JsonPropertyName("summary_text")]
    public string? SummaryText { get; set; }
}