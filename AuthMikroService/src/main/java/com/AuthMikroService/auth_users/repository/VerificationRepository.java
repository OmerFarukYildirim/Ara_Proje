package com.AuthMikroService.auth_users.repository;

import com.AuthMikroService.auth_users.entity.Verification;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface VerificationRepository extends JpaRepository<Verification, Long> {

    Optional<Verification> findByEmail(String email);
    @Transactional
    @Modifying
    @Query("DELETE FROM Verification v WHERE v.verificationCodeExpiry < ?1")
    void deleteByVerificationCodeExpiryBefore(LocalDateTime expiryTime);
}
