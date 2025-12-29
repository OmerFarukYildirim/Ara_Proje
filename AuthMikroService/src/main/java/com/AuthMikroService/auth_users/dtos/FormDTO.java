package com.AuthMikroService.auth_users.dtos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class FormDTO {
    @NotBlank(message = "Email is required")
    private String email;
    @NotBlank(message = "phone number is required")
    private String phoneNumber;
    @NotBlank(message = "topic is required")
    private String topic;
    @NotBlank(message = "content is required")
    private String content;
}
