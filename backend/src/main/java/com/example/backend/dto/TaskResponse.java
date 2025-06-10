package com.example.backend.dto;

import com.example.backend.entity.*;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import com.example.backend.entity.Status;
import com.example.backend.entity.TaskPriority;

@Getter
public class TaskResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final LocalDate dueDate;
    private final Status status;
    private final TaskPriority priority;
    private final Long projectId;
    private final Long assigneeId;
    private final String assigneeUsername;
    private final String assigneeAvatarUrl;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;


    public TaskResponse (Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.dueDate = task.getDueDate();
        this.status = task.getStatus();
        this.priority = task.getPriority();

        if (task.getProject() != null) {
            this.projectId = task.getProject().getId();
        } else {
            this.projectId = null;
        }

        if (task.getAssignee() != null) {
            User assignee = task.getAssignee();
            this.assigneeId = assignee.getId();
            this.assigneeUsername = assignee.getName();
            this.assigneeAvatarUrl = Optional.ofNullable(assignee.getUserProfile())
                    .map(UserProfile::getAvatarUrl)
                    .orElse(null);
        } else {
            this.assigneeId = null;
            this.assigneeUsername = null;
            this.assigneeAvatarUrl = null;
        }

        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
    }
}