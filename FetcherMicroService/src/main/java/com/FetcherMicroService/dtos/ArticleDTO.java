package com.FetcherMicroService.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ArticleDTO {
    private String title;
    private String description;
    private String content;
    private String url;
    private String image_url;
    private String category;
    // İstersen JSON'daki diğer alanları da ekleyebilirsin
}
