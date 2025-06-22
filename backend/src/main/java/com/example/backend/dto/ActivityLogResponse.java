package com.example.backend.dto;

import com.example.backend.entity.activitylog.ActivityLog;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.user.User;
import com.example.backend.entity.user.UserProfile;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Optional;

@Getter
public class ActivityLogResponse {
    private final Long id;
    private final String message;
    private final ActivityLogType type;
    private final LocalDateTime createdAt;
    private final Long userId;
    private final String userName;
    private final String userAvatarUrl;
    private final Long projectId;
    private final String projectName;

    public ActivityLogResponse(ActivityLog activityLog) {
        this.id = activityLog.getId();
        this.message = activityLog.getMessage();
        this.type = activityLog.getType();
        this.createdAt = activityLog.getCreatedAt();
        this.projectId = activityLog.getProject().getId();
        this.projectName = activityLog.getProject().getName();

        User user = activityLog.getUser();
        if (user != null) {
            this.userId = user.getId();
            this.userName = user.getName();
            this.userAvatarUrl = Optional.ofNullable(user.getUserProfile())
                    .map(UserProfile::getAvatarUrl)
                    .orElse(null);
        } else {
            this.userId = null;
            this.userName = "System";
            this.userAvatarUrl = null;
        }
    }
}