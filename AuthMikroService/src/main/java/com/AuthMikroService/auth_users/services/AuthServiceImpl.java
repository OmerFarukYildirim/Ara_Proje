package com.AuthMikroService.auth_users.services;

import com.AuthMikroService.auth_users.dtos.LoginRequest;
import com.AuthMikroService.auth_users.dtos.LoginResponse;
import com.AuthMikroService.auth_users.dtos.RegistrationRequest;
import com.AuthMikroService.auth_users.dtos.VerificationRequest;
import com.AuthMikroService.auth_users.entity.User;
import com.AuthMikroService.auth_users.entity.Verification;
import com.AuthMikroService.auth_users.repository.UserRepository;
import com.AuthMikroService.auth_users.repository.VerificationRepository;
import com.AuthMikroService.exceptions.BadRequestException;
import com.AuthMikroService.exceptions.NotFoundException;
import com.AuthMikroService.notification.dtos.NotificationDTO;
import com.AuthMikroService.notification.services.NotificationService;
import com.AuthMikroService.response.Response;
import com.AuthMikroService.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final VerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final NotificationService notificationService;
    private final KafkaTemplate<String, NotificationDTO> kafkaTemplate;

    @Override
    @Transactional
    public Response<?> register(RegistrationRequest registrationRequest) {
        log.info("INSIDE register()");

        // 1. Asıl User tablosunda bu email var mı diye kontrol et
        if (userRepository.existsByEmail(registrationRequest.getEmail()) || userRepository.existsByPhoneNumber(registrationRequest.getPhoneNumber())) {
            throw new BadRequestException("Your email or phone number already registered.");
        }

        // 2. Bekleyen bir kayıt var mı diye kontrol et, varsa sil (kodu tekrar gönderme işlevi)
        verificationRepository.findByEmail(registrationRequest.getEmail()).ifPresent(verificationRepository::delete);

        // 3. Kod üret ve YALNIZCA Verification nesnesi oluştur
        Random random = new SecureRandom();
        String code = String.valueOf(1000 + random.nextInt(9000));

        Verification verification = Verification.builder()
                .email(registrationRequest.getEmail())
                .name(registrationRequest.getName())
                .surname(registrationRequest.getSurname())
                .password(passwordEncoder.encode(registrationRequest.getPassword()))
                .phoneNumber(registrationRequest.getPhoneNumber())
                .verificationCode(code)
                .verificationCodeExpiry(LocalDateTime.now().plusMinutes(15))
                .build();

        // 4. Sadece geçici Verification kaydını DB'ye yaz
        verificationRepository.save(verification);

        // 5. E-postayı gönder
        sendVerificationEmail(registrationRequest.getEmail(), code, "Hesap Doğrulama Kodunuz",
                "Hesabınızı doğrulamak için kodunuz: " + code + "\nBu kod 15 dakika geçerlidir.");

        // ÖNEMLİ: Artık burada User kaydedilmiyor!
        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Verification code sent to your email. Please verify to complete registration.")
                .build();
    }

    // --- YENİ METOD: KAYIT DOĞRULAMA ---
    @Override
    @Transactional
    public Response<LoginResponse> verifyRegistration(VerificationRequest verificationRequest) {
        log.info("INSIDE verifyRegistration()");

        // 1. Geçici kaydı bul
        Verification verification = verificationRepository.findByEmail(verificationRequest.getEmail())
                .orElseThrow(() -> new BadRequestException("No pending registration found for this email."));

        // 2. Kodu ve süresini kontrol et
        validateCode(verification, verificationRequest.getCode());

        // 3. DOĞRULAMA BAŞARILI: Şimdi asıl User'ı oluştur
        User newUser = User.builder()
                .name(verification.getName())
                .surname(verification.getSurname())
                .email(verification.getEmail())
                .password(verification.getPassword()) // Zaten hash'li şifreyi kullan
                .phoneNumber(verification.getPhoneNumber())
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .isFirstLogin(true)
                .build();
        userRepository.save(newUser);

        // 4. Geçici kaydı temizle
        verificationRepository.delete(verification);

        // 5. Kullanıcıyı otomatik login yap ve token dön
        String token = jwtUtils.generateToken(newUser.getEmail());
        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(token);

        return Response.<LoginResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Account successfully registered and logged in.")
                .data(loginResponse)
                .build();
    }


    @Override
    public Response<?> login(LoginRequest loginRequest) {
        log.info("INSIDE login() - Step 1");

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password.");
        }

        if (!user.isActive()) {
            throw new NotFoundException("Account not active. Please contact support.");
        }

        // Bekleyen bir login doğrulaması varsa sil
        verificationRepository.findByEmail(loginRequest.getEmail()).ifPresent(verificationRepository::delete);

        Random random = new SecureRandom();
        String code = String.valueOf(1000 + random.nextInt(9000));

        // Login için yeni bir doğrulama kaydı oluştur
        Verification verification = Verification.builder()
                .email(loginRequest.getEmail())
                .verificationCode(code)
                .verificationCodeExpiry(LocalDateTime.now().plusMinutes(10))
                // Diğer alanlar null kalabilir çünkü bu sadece login için
                .name("-") .surname("-") .password("-") // Not-null constraint için placeholder
                .build();
        verificationRepository.save(verification);

        sendVerificationEmail(user.getEmail(), code, "Giriş Doğrulama Kodunuz",
                "Giriş yapmak için doğrulama kodunuz: " + code + "\nBu kod 10 dakika geçerlidir.");

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Verification code has been sent to your email.")
                .build();
    }

    @Override
    public Response<LoginResponse> verifyCodeAndLogin(VerificationRequest verificationRequest) {
        log.info("INSIDE verifyCodeAndLogin() - Step 2");

        // Önce asıl kullanıcı var mı diye kontrol et
        User user = userRepository.findByEmail(verificationRequest.getEmail())
                .orElseThrow(() -> new BadRequestException("User not found."));

        // Sonra doğrulama kaydını bul
        Verification verification = verificationRepository.findByEmail(verificationRequest.getEmail())
                .orElseThrow(() -> new BadRequestException("No verification attempt found. Please try logging in again."));

        validateCode(verification, verificationRequest.getCode());

        String token = jwtUtils.generateToken(user.getEmail());

        // Geçici kaydı temizle
        verificationRepository.delete(verification);

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(token);

        return Response.<LoginResponse>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Login Successful")
                .data(loginResponse)
                .build();
    }

    // --- YARDIMCI METODLAR ---
    private void sendVerificationEmail(String email, String code, String subject, String body) {
        log.info("Hazırlanan mail Kafka kuyruğuna bırakılıyor: {}", email);

        NotificationDTO notificationDTO = NotificationDTO.builder()
                .recipient(email)
                .subject(subject)
                .body(body)
                .isHtml(false)
                .build();

        kafkaTemplate.send("notification-events", email, notificationDTO);

        log.info("Mail emri başarıyla Kafka'ya iletildi. Auth servisi işlemine devam ediyor.");
    }

    private void validateCode(Verification verification, String code) {
        if (!verification.getVerificationCode().equals(code)) {
            throw new BadRequestException("Invalid verification code.");
        }
        if (verification.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            // Süresi dolmuşsa DB'den sil
            verificationRepository.delete(verification);
            throw new BadRequestException("Verification code has expired. Please try again.");
        }
    }

    @Override
    public Response<?> resendVerificationCode(String email) {
        // 1. Mevcut bekleyen kaydı bul
        Verification verification = verificationRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Bekleyen doğrulama bulunamadı. Lütfen baştan kayıt olun."));

        // 2. Yeni kod üret
        Random random = new SecureRandom();
        String newCode = String.valueOf(1000 + random.nextInt(9000));

        // 3. Mevcut nesneyi güncelle (Şifreye dokunmuyoruz, eski hash kalıyor!)
        verification.setVerificationCode(newCode);
        verification.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(15));

        // 4. Güncellemeyi kaydet
        verificationRepository.save(verification);

        // 5. Kafka'ya haber ver (Sadece burası aynı)
        sendVerificationEmail(email, newCode, "Yeni Kodunuz", "Doğrulama kodunuz: " + newCode);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Kod tekrar gönderildi.")
                .build();
    }
}