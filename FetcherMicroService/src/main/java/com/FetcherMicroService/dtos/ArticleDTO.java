package com.FetcherMicroService.dtos;

import lombok.Data;

@Data
public class ArticleDTO {
    private String title;
    private String description;
    private String content;
    private String url;
    // İstersen JSON'daki diğer alanları da ekleyebilirsin
}
