package com.AuthMikroService.auth_users.services;

import com.AuthMikroService.auth_users.dtos.LoginRequest;
import com.AuthMikroService.auth_users.dtos.LoginResponse;
import com.AuthMikroService.auth_users.dtos.RegistrationRequest;
import com.AuthMikroService.auth_users.dtos.VerificationRequest;
import com.AuthMikroService.response.Response;

public interface AuthService {
    Response<?> register(RegistrationRequest registrationRequest);
    Response<LoginResponse> verifyRegistration(VerificationRequest verificationRequest);
    Response<?> login(LoginRequest loginRequest);
    Response<LoginResponse> verifyCodeAndLogin(VerificationRequest verificationRequest);
}
