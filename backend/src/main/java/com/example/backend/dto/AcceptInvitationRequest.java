package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AcceptInvitationRequest {
    @NotBlank(message = "초대 토큰은 필수")
    private String token;
}