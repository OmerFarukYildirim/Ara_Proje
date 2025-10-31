package com.FetcherMicroService.dtos;

import lombok.Data;

@Data
public class ArticleDTO {
    private String title;
    private String description;
    private String content;
    private String url;
    private String image_url;
    private String category;
    // İstersen JSON'daki diğer alanları da ekleyebilirsin
}
