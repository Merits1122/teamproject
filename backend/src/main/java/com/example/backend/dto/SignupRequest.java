package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class SignupRequest {
    @NotBlank(message = "이름은 필수")
    private String name;

    @NotBlank(message = "이메일은 필수")
    @Email(message = "유효한 이메일 주소를 입력")
    private String email;

    @NotBlank(message = "비밀번호는 필수")
    @Size(min = 8, message = "비밀번호는 최소 8자 이상")
    @Pattern(
            regexp = ".*[!@#$,./?].*",
            message = "비밀번호는 특수문자(!@#$,./?)를 포함"
    )
    private String password;
}
