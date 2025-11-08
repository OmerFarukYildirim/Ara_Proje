package com.FetcherMicroService.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeminiResponse {
    private List<GeminiCandidate> candidates;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeminiCandidate {
        private GeminiContent content;
    }

    // Gelen JSON'daki 'text' alanını en kolay yoldan almak için
    // (candidates[0].content.parts[0].text)
    public String getGeneratedText() {
        try {
            return this.candidates.get(0).getContent().getParts().get(0).getText();
        } catch (Exception e) {
            System.err.println("Gemini yanıtı parse edilemedi: " + e.getMessage());
            return null;
        }
    }
}