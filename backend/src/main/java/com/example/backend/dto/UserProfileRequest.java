package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserProfileRequest {
    @NotBlank(message = "이름은 필수")
    @Size(max = 50, message = "이름은 최대 50자")
    private String name;

    @Size(max = 500, message = "자기소개는 최대 500자")
    private String introduce;
}