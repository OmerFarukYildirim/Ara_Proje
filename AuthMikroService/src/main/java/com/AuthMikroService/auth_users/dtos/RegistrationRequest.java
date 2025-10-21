package com.AuthMikroService.auth_users.dtos;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
    @Size(min = 3, message = "Password must be at least 3 characters long")
    private String password;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

}
