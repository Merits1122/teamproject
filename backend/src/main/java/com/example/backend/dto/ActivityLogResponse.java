package com.example.backend.dto;

import com.example.backend.entity.activity.ActivityLog;
import com.example.backend.util.TimeUtils;
import lombok.Builder;

@Builder
public record ActivityLogResponse(
        String username,
        String action,
        String details,
        String time
) {
    public static ActivityLogResponse from(ActivityLog log) {
        return ActivityLogResponse.builder()
                .username(log.getUser().getName())
                .action(log.getAction())
                .details(log.getMessage())
                .time(TimeUtils.getTimeAgo(log.getTimestamp()))
                .build();
    }
}