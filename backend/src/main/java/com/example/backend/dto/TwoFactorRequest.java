package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TwoFactorRequest {
    @NotBlank(message = "이메일은 필수")
    @Email(message = "유효한 이메일 주소를 입력")
    private String email;

    @NotBlank(message = "인증 코드는 필수")
    @Pattern(regexp = "\\d{6}", message = "인증 코드는 6자리 숫자")
    private String code;
}