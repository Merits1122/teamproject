package com.example.backend.entity.notification;

import lombok.Getter;

@Getter
public enum NotificationType {
    TASK_ASSIGNED("새로운 업무 할당"),
    TASK_UPDATED("업무 업데이트"),
    TASK_COMMENT("새로운 댓글"),
    TASK_DUE_DATE("업무 마감 임박"),
    PROJECT_INVITATION("프로젝트 초대");

    private final String displayName;

    NotificationType(String displayName) {
        this.displayName = displayName;
    }
}