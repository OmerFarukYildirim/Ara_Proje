package com.FetcherMicroService.apiconfig;

import com.FetcherMicroService.dtos.KafkaCategoryRequest;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    // Eğer application.properties veya Docker'dan değer gelmezse varsayılan olarak 'kafka:9092' kullan.
    @Value("${spring.kafka.bootstrap-servers:kafka:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:fetcher-group}")
    private String groupId;

    // Kafka adresini garantileyen yardımcı metod
    private String getGuaranteedBootstrapServers() {
        if (this.bootstrapServers == null || this.bootstrapServers.trim().isEmpty()) {
            System.err.println("!!! DIKKAT: Kafka adresi bulunamadı. Hardcoded 'kafka:9092' kullanılıyor !!!");
            return "kafka:9092";
        }
        System.out.println(">>> Kafka adresi kullanılıyor: " + this.bootstrapServers);
        return this.bootstrapServers;
    }

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        // BURASI KRİTİK: Garantili adresi kullanıyoruz
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, getGuaranteedBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, KafkaCategoryRequest.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.FetcherMicroService.dtos");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);

        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        return factory;
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        // BURASI KRİTİK: Garantili adresi kullanıyoruz
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, getGuaranteedBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}