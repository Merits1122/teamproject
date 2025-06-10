package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "이메일은 필수")
    @Email(message = "유효한 이메일 주소를 입력")
    private String email;

    @NotBlank(message = "비밀번호는 필수")
    private String password;
}
