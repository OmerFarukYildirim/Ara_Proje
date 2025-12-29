package com.AuthMikroService.auth_users.dtos;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegistrationRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2,max=20, message = "Name must be at least 3 characters long")
    private String name;

    @NotBlank(message = "Surname is required")
    @Size(min = 2,max=20, message = "Surname must be at least 3 characters long")
    private String surname;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%&+=!_.^])(?=\\S+$).{8,}$",
            message = "Şifre en az 8 karakter olmalı, 1 büyük harf, 1 sayı ve 1 özel karakter içermelidir."
    )
    private String password;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

}
