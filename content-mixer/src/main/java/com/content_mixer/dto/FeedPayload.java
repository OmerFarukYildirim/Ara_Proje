package com.content_mixer.dto;

// FeedPayload.java
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor  // Boş constructor (Jackson için şart)
@AllArgsConstructor
public class FeedPayload {
    @JsonProperty("user_id")
    private String user_id;
    // Haber içeriği karmaşık olabilir, şimdilik Map listesi olarak alıyoruz
    // İstersen detaylı NewsArticle sınıfı da yapabilirsin.
    private List<Map<String, Object>> feed;
}
