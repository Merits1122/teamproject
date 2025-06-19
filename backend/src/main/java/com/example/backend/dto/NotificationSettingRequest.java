package com.example.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationSettingRequest {
    private boolean commentAlertEnabled;
    private boolean taskAssignAlertEnabled;
    private boolean projectInviteAlertEnabled;
    private boolean weeklyDigestEnabled;
    private boolean dailyDigestEnabled;
}