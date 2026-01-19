package com.AuthMikroService.auth_users.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDTO {


    private Long id;
    private String name;
    private String surname;
    private String email;
    private String phoneNumber;

    //// Write-only: Included when receiving data, excluded when sending data
    /// //Only used for writing (deserialization), ignored during reading (serialization)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%&+=!_.^])(?=\\S+$).{8,}$",
            message = "Şifre en az 8 karakter olmalı, 1 büyük harf, 1 sayı ve 1 özel karakter içermelidir."
    )
    private String password;

    private boolean isActive;

    private String address;

    private boolean isFirstLogin;


}
