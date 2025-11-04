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
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "name is required")
    private String name;
    @NotBlank(message = "surname is required")
    private String surname;
    @Column(unique = true)
    private String email;

    @NotBlank(message = "password is required")
    private String password;
    @Column(unique = true)
    private String phoneNumber;

    private String profileUrl;

    private String address;

    private boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean isFirstLogin;

}











