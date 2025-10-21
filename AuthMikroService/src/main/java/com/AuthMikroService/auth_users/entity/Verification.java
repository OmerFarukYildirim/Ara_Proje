package com.AuthMikroService.auth_users.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "verifications")
public class Verification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;
    @NotBlank(message = "name is required")
    private String name;
    @NotBlank(message = "surname is required")
    private String surname;

    @NotBlank(message = "password is required")
    private String password;
    @Column(unique = true)
    private String phoneNumber;

    @Column(nullable = true) // Sadece giriş sürecinde kullanılacağı için nullable olabilir
    private String verificationCode;

    @Column(nullable = true)
    private LocalDateTime verificationCodeExpiry;
}
