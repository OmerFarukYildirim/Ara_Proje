package com.AuthMikroService.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaProducerConfig {

    // Bu topic (konu) otomatik oluşturulur.
    // Mail atma emirleri burada birikecek.
    @Bean
    public NewTopic notificationTopic() {
        return TopicBuilder.name("notification-events")
                .partitions(3)
                .replicas(1)
                .build();
    }
}