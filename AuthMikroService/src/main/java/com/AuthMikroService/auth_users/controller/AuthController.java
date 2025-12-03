package com.AuthMikroService.auth_users.controller;

import com.AuthMikroService.auth_users.dtos.LoginRequest;
import com.AuthMikroService.auth_users.dtos.LoginResponse;
import com.AuthMikroService.auth_users.dtos.RegistrationRequest;
import com.AuthMikroService.auth_users.dtos.VerificationRequest;
import com.AuthMikroService.auth_users.services.AuthService;
import com.AuthMikroService.response.Response;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Response<?>> register(@Valid @RequestBody RegistrationRequest registrationRequest) {
        return ResponseEntity.ok(authService.register(registrationRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<Response<?>> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/verify")
    public ResponseEntity<Response<LoginResponse>> verifyAndLogin(@Valid @RequestBody VerificationRequest verificationRequest) {
        return ResponseEntity.ok(authService.verifyCodeAndLogin(verificationRequest));
    }

    @PostMapping("/verifyReg")
    public ResponseEntity<Response<LoginResponse>> verifyRegister(@Valid @RequestBody VerificationRequest verificationRequest) {
        return ResponseEntity.ok(authService.verifyRegistration(verificationRequest));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<Response<?>> resendCode(@RequestParam("email") String email) {
        return ResponseEntity.ok(authService.resendVerificationCode(email));
    }
}
