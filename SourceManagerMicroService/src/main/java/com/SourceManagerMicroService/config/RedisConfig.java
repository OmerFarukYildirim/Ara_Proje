package com.SourceManagerMicroService.config;

import com.fasterxml.jackson.databind.ObjectMapper; // Jackson kütüphanesi
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.FetcherMicroService.dtos.NewsResponseDTO; // DTO'nuzun tam yolu
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, NewsResponseDTO> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, NewsResponseDTO> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Jackson JSON Serializer oluşturma
        Jackson2JsonRedisSerializer<NewsResponseDTO> serializer =
                new Jackson2JsonRedisSerializer<>(NewsResponseDTO.class);

        // ObjectMapper'ı yapılandır (opsiyonel ama iyi bir pratiktir)
        ObjectMapper om = new ObjectMapper();
        om.registerModule(new JavaTimeModule()); // Tarih/zaman formatları için
        serializer.setObjectMapper(om);

        // Anahtarlar için String serializer
        template.setKeySerializer(new StringRedisSerializer());

        // Değerler (value) için JSON serializer
        template.setValueSerializer(serializer);

        // Hash anahtarları ve değerleri için de aynı ayarları yapabilirsiniz (eğer hash kullanacaksanız)
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }
}
