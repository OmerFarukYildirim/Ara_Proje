package com.FetcherMicroService.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // JSON'da bilmediğin alan varsa hata verme
public class KafkaCategoryRequest {
    // Python'un yolladığı JSON'daki 'category' anahtarıyla eşleşir
    private String category;
    private int count;
}