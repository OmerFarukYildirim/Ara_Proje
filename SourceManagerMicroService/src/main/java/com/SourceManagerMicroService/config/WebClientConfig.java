package com.SourceManagerMicroService.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${fetcher.service.base-url}")
    private String fetcherServiceBaseUrl;

    @Bean
    public WebClient fetcherWebClient() {
        return WebClient.builder()
                .baseUrl(fetcherServiceBaseUrl)
                .build();
    }
}
