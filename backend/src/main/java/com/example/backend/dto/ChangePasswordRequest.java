package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {
    @NotBlank(message = "현재 비밀번호는 필수")
    private String currentPassword;

    @NotBlank(message = "새 비밀번호는 필수")
    @Size(min = 8, message = "새 비밀번호는 최소 8자 이상") // 정책에 맞게 조정
    @Pattern(
            regexp = ".*[!@#$,./?].*",
            message = "새 비밀번호는 특수문자(!@#$,./?)를 포함"
    )
    private String newPassword;
}