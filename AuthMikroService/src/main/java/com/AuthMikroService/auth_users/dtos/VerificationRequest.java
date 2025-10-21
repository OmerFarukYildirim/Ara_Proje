package com.AuthMikroService.auth_users.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerificationRequest {
    @NotBlank
    private String email;
    @NotBlank
    private String code;
}