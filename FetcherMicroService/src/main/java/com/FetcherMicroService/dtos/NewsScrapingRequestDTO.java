package com.FetcherMicroService.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // JSON'da bilmediğin alan varsa hata verme
public class NewsScrapingRequestDTO {
    String url;
    @JsonProperty("image_url")
    String imageUrl;
    @JsonProperty("target_category")
    String targetCategory;
}
