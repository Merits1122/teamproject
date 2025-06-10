package com.example.backend.dto;

import com.example.backend.entity.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponse {
    private String name;
    private String token;
    private boolean twoFactorRequired = false;
    private String message;
    private String avatarUrl;

    public LoginResponse(String token, User user) {
        this.token = token;
        this.message = "로그인에 성공했습니다.";
        if (user != null) {
            this.name = user.getName();
            if (user.getUserProfile() != null) {
                this.avatarUrl = user.getUserProfile().getAvatarUrl();
            }
        }
    }

    public LoginResponse(boolean twoFactorRequired, String message) {
        this.twoFactorRequired = twoFactorRequired;
        this.message = message;
    }
}