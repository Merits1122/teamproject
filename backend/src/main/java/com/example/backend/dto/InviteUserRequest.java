package com.example.backend.dto;

import com.example.backend.entity.project.ProjectRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InviteUserRequest {
    @NotBlank(message = "초대할 사용자의 이메일은 필수")
    @Email(message = "유효한 이메일 주소를 입력")
    private String email;

    @NotNull(message = "부여할 역할은 필수")
    private ProjectRole role;
}