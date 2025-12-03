package com.content_mixer.service;

import com.content_mixer.dto.FeedPayload;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.nio.charset.StandardCharsets;

@Service
public class FeedMixerService {

    @KafkaListener(topics = "${app.kafka.topic.request}", groupId = "news-mixer-group")
    @SendTo("${app.kafka.topic.reply}")
    public Message<FeedPayload> consumeAndMix(
            @Payload FeedPayload payload,
            // SADECE HEADER DEĞERİNİ (byte[] veya String) BEKLE
            // Obje yerine byte[] olarak almayı deneyelim:
            @Header(value = "correlation_id", required = false) byte[] correlationIdBytes) {

        System.out.println("Kafka'dan istek geldi. User: " + payload.getUser_id());

        if (payload.getFeed() != null && !payload.getFeed().isEmpty()) {
            Collections.shuffle(payload.getFeed());
            System.out.println("Feed karıştırıldı. Boyut: " + payload.getFeed().size());
        }

        MessageBuilder<FeedPayload> builder = MessageBuilder.withPayload(payload);

        // Correlation ID'yi al ve geri ekle
        if (correlationIdBytes != null) {
            // Byte dizisini String'e çevir
            String correlationIdStr = new String(correlationIdBytes, StandardCharsets.UTF_8);

            // Cevabı String yerine orijinal byte dizisi olarak geri ekle (Python'un beklediği format)
            // Ya da temiz string olarak ekle:
            builder.setHeader("correlation_id", correlationIdStr);

            System.out.println("Cevap dönülüyor. Correlation ID: " + correlationIdStr);
        }

        return builder.build();
    }
}