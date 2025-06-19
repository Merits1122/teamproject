package com.example.backend.dto;

import com.example.backend.entity.user.User;
import com.example.backend.entity.user.UserProfile;
import com.example.backend.entity.user.UserSecurity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String introduce;
    private String avatarUrl;
    private boolean twoFactorEnabled;

    public UserProfileResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();

        UserProfile userProfile = user.getUserProfile();
        if (userProfile != null) {
            this.introduce = userProfile.getIntroduce();
            this.avatarUrl = userProfile.getAvatarUrl();
        } else {
            this.introduce = "";
            this.avatarUrl = null;
        }

        UserSecurity userSecurity = user.getUserSecurity();
        if (userSecurity != null) {
            this.twoFactorEnabled = userSecurity.isTwoFactorEnabled();
        } else {
            this.twoFactorEnabled = false;
        }
    }
}