package com.example.backend.dto;

import com.example.backend.entity.user.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponse {
    private String token;
    private boolean twoFactorRequired = false;
    private UserInfo user;

    @Getter
    private static class UserInfo {
        private Long id;
        private String name;
        private String email;
        private User.AuthProvider provider;

        public UserInfo(User user) {
            this.id = user.getId();
            this.name = user.getName();
            this.email = user.getEmail();
            this.provider = user.getProvider();
        }
    }

    public LoginResponse(String token, User user) {
        this.token = token;
        this.twoFactorRequired = false;
        this.user = new UserInfo(user);
    }

    public LoginResponse(boolean twoFactorRequired, User user) {
        this.twoFactorRequired = twoFactorRequired;
        this.user = new UserInfo(user);
    }
}