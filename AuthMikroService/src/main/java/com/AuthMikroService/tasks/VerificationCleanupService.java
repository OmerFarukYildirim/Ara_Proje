package com.AuthMikroService.tasks;

import com.AuthMikroService.auth_users.repository.VerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationCleanupService {

    private final VerificationRepository verificationRepository;

    /**
     * Bu metod, her saat başında çalışır (örn: 13:00, 14:00).
     * `Verification` tablosunda son kullanma tarihi geçmiş olan tüm kayıtları siler.
     * cron = "[saniye] [dakika] [saat] [gün] [ay] [haftanın günü]"
     */
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredVerifications() {
        LocalDateTime now = LocalDateTime.now();
        log.info("Running verification cleanup task at {}", now);
        try {
            verificationRepository.deleteByVerificationCodeExpiryBefore(now);
            log.info("Successfully cleaned up expired verification records.");
        } catch (Exception e) {
            log.error("Error during verification cleanup task", e);
        }
    }
}
