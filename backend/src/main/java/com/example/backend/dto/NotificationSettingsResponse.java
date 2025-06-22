package com.example.backend.dto;

import com.example.backend.entity.notification.NotificationSettings;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NotificationSettingsResponse {
    private boolean emailNotifications;
    private boolean taskAssigned;
    private boolean taskUpdated;
    private boolean taskCommented;
    private boolean taskDueDate;
    private boolean projectInvitation;
    private boolean dailyDigest;
    private boolean weeklyDigest;

    public NotificationSettingsResponse(NotificationSettings settings) {
        this.emailNotifications = settings.isEmailNotifications();
        this.taskAssigned = settings.isTaskAssigned();
        this.taskUpdated = settings.isTaskUpdated();
        this.taskCommented = settings.isTaskCommented();
        this.taskDueDate = settings.isTaskDueDate();
        this.projectInvitation = settings.isProjectInvitation();
        this.dailyDigest = settings.isDailyDigest();
        this.weeklyDigest = settings.isWeeklyDigest();
    }
}