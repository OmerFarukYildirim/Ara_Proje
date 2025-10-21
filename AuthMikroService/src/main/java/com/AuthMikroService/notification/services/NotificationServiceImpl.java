package com.AuthMikroService.notification.services;

import com.AuthMikroService.notification.dtos.NotificationDTO;
import com.AuthMikroService.notification.entity.Notification;
import com.AuthMikroService.notification.repository.NotificationRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender javaMailSender;
    private final NotificationRepository notificationRepository;


    @Override
    @Async
    public void sendEmail(NotificationDTO notificationDTO) {
        log.info("Inside sendEmail() - ASYNC thread started."); // [1]

        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());

            helper.setTo(notificationDTO.getRecipient());
            helper.setSubject(notificationDTO.getSubject());
            helper.setText(notificationDTO.getBody(), notificationDTO.isHtml());

            log.info("Attempting to send email to {}...", notificationDTO.getRecipient()); // [2]

            // --- KİLİTLENME NOKTASI 1 (En Yüksek İhtimal) ---
            javaMailSender.send(mimeMessage);
            // ---------------------------------------------

            log.info("Email sent successfully to {}. Attempting to save notification to DB...", notificationDTO.getRecipient()); // [3]

            Notification notificationToSave = Notification.builder()
                    .recipient(notificationDTO.getRecipient())
                    .subject(notificationDTO.getSubject())
                    .body(notificationDTO.getBody())
                    .isHtml(notificationDTO.isHtml())
                    .build();

            // --- KİLİTLENME NOKTASI 2 (Düşük İhtimal) ---
            notificationRepository.save(notificationToSave);
            // ------------------------------------------

            log.info("Saved notification to DB. ASYNC task finished."); // [4]

        } catch (Exception e) {
            // Hata mesajını gizlememek için stack trace'i logla!
            log.error("Error occurred while sending email: ", e); // [5] BU ÇOK ÖNEMLİ
            throw new RuntimeException(e.getMessage());
        }
    }
}









