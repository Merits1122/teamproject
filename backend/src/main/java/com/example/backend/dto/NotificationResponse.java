package com.example.backend.dto;

import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.user.User;
import com.example.backend.entity.user.UserProfile;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.Optional;

@Getter
public class NotificationResponse {
    private final Long id;
    private final NotificationType type;
    private final String title;
    private final String description;
    private final String link;
    private final boolean isRead;
    private final LocalDateTime createdAt;
    private final UserInfo user;

    @Getter
    private static class UserInfo {
        private String name;
        private String avatarUrl;

        public UserInfo(User user) {
            this.name = user.getName();
            this.avatarUrl = Optional.ofNullable(user.getUserProfile())
                    .map(UserProfile::getAvatarUrl)
                    .orElse(null);
        }
    }

    public NotificationResponse(Notification notification) {
        this.id = notification.getId();
        this.type = notification.getType();
        this.title = notification.getType().getDisplayName();
        this.description = notification.getMessage();
        this.link = notification.getLink();
        this.isRead = notification.isRead();
        this.createdAt = notification.getCreatedAt();

        if (notification.getActor() != null) {
            this.user = new UserInfo(notification.getActor());
        } else {
            this.user = null;
        }
    }
    @JsonProperty("isRead")
    public boolean isRead() {
        return this.isRead;
    }
}