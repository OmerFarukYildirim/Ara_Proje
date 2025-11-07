// SummarizationService.cs (Yeni bir dosya oluştur)
using System.Net.Http.Headers;

namespace Processor.Services;
using Processor.Models;
public class SummarizationService
{
    private readonly HttpClient _httpClient;
    private readonly string _hfApiUrl;
    private readonly ILogger<SummarizationService> _logger;

    public SummarizationService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<SummarizationService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("HuggingFace");
        _hfApiUrl = config["HuggingFace:ApiUrl"]!;
        _logger = logger;
    }

    public async Task<string?> SummarizeAsync(string? textToSummarize)
    {
        if (string.IsNullOrEmpty(textToSummarize))
            return null;
        
        try
        {
            // HF API'si çok uzun metinleri sevmez, ilk ~1024 token'ı alalım
            // (Bu, Java'daki 'content'in çok uzun olmamasını sağlar)
            // İstersen bu 'trimming' (kırpma) mantığını daha da geliştirebilirsin.
            var shortText = textToSummarize.Length > 1500 
                ? textToSummarize.Substring(0, 1500) 
                : textToSummarize;

            var payload = new { inputs = shortText };
            
            // PostAsJsonAsync, System.Net.Http.Json kütüphanesini gerektirir
            var response = await _httpClient.PostAsJsonAsync(_hfApiUrl, payload);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"HF API Hatası: {await response.Content.ReadAsStringAsync()}");
                return null;
            }

            var hfResponse = await response.Content.ReadFromJsonAsync<List<HfSummaryResponse>>();
            return hfResponse?.FirstOrDefault()?.SummaryText;
        }
        catch (Exception e)
        {
            _logger.LogError($"Özetleme Hatası: {e.Message}");
            return null;
        }
    }
}