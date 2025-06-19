package com.example.backend.dto;

import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.NotificationCategory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private NotificationCategory category;
    private String content;
    private String message;
    private String createdAt;
    private boolean read;
    private LocalDateTime timestamp;

    public static NotificationResponse from(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .category(notification.getCategory())
                .read(notification.isRead())
                .timestamp(notification.getTimestamp())
                .build();
    }
}