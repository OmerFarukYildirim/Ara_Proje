// Controllers/ProcessorController.cs
using Microsoft.AspNetCore.Mvc;
using Processor.Services;

namespace Processor.Controllers;

[ApiController]
public class ProcessorController : ControllerBase
{
    private readonly SummarizationService _summarizer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ProcessorController> _logger;

    public ProcessorController(SummarizationService summarizer, 
                             IHttpClientFactory httpClientFactory, 
                             ILogger<ProcessorController> logger)
    {
        _summarizer = summarizer;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    // Java'dan (:8091) gelen isteği karşılayan endpoint
    [HttpPost("/summarize-and-forward")]
    public async Task<IActionResult> SummarizeAndForward([FromBody] List<ArticleModel> articles)
    {
        _logger.LogInformation($"{articles.Count} adet makale özetlenmek üzere alındı.");

        // 1. Adım: Özetle (Paralel olarak)
        var summaryTasks = articles.Select(async article =>
        {
            article.Summary = await _summarizer.SummarizeAsync(article.Content);
            return article;
        }).ToList();
        
        var processedArticles = await Task.WhenAll(summaryTasks);

        _logger.LogInformation($"{processedArticles.Length} makale özetlendi. AI-Enrichment'a paslanıyor...");

        // 2. Adım: AI-Enrichment'a (:8000) Pasla
        try
        {
            var aiClient = _httpClientFactory.CreateClient("AiEnrichment");
            
            // Python'un /enrich-and-save endpoint'ine yolla
            var response = await aiClient.PostAsJsonAsync("/enrich-and-save", processedArticles);

            response.EnsureSuccessStatusCode(); // Hata varsa fırlat

            // Python'dan gelen yanıtı ({"saved_count": ...})
            // olduğu gibi Java'ya (Fetcher) geri döndür
            var responseData = await response.Content.ReadFromJsonAsync<object>();
            return Ok(responseData);
        }
        catch (Exception e)
        {
            _logger.LogError($"AI-Enrichment'a iletme hatası: {e.Message}");
            return StatusCode(502, "AI-Enrichment servisine iletimde hata.");
        }
    }
}