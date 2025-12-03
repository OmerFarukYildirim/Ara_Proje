package com.AuthMikroService.notification.services;

import com.AuthMikroService.notification.dtos.NotificationDTO;
import com.AuthMikroService.notification.entity.Notification;
import com.AuthMikroService.notification.repository.NotificationRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.kafka.annotation.KafkaListener;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender javaMailSender;
    private final NotificationRepository notificationRepository;


    @Override
    @KafkaListener(topics = "notification-events", groupId = "notification-group")
    public void sendEmail(NotificationDTO notificationDTO) { // Metod ismini değiştirebilirsin (opsiyonel)

        log.info("Kafka Listener: Yeni bir mail emri yakalandı -> {}", notificationDTO.getRecipient());

        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());

            helper.setTo(notificationDTO.getRecipient());
            helper.setSubject(notificationDTO.getSubject());
            helper.setText(notificationDTO.getBody(), notificationDTO.isHtml());

            log.info("SMTP Sunucusuna bağlanılıyor: {}...", notificationDTO.getRecipient());

            // Maili gönder
            javaMailSender.send(mimeMessage);

            log.info("Mail başarıyla gönderildi. Veritabanına loglanıyor...");

            Notification notificationToSave = Notification.builder()
                    .recipient(notificationDTO.getRecipient())
                    .subject(notificationDTO.getSubject())
                    .body(notificationDTO.getBody())
                    .isHtml(notificationDTO.isHtml())
                    .build();

            notificationRepository.save(notificationToSave);

            log.info("İşlem tamamlandı. Sıradaki mesaj bekleniyor.");

        } catch (Exception e) {
            log.error("Kafka mesajı işlenirken hata oluştu (Mail Gönderilemedi): ", e);
            // Burada hata fırlatmazsan Kafka mesajı "işlendi" sayar ve geçer.
            // Eğer tekrar denemesini istiyorsan exception fırlatmalısın.
        }
    }
}









