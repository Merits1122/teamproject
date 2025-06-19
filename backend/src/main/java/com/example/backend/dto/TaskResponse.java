package com.example.backend.dto;

import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.entity.user.UserProfile;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import com.example.backend.entity.Status;
import com.example.backend.entity.task.TaskPriority;
import com.example.backend.entity.project.ProjectMember;

@Getter
public class TaskResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final LocalDate dueDate;
    private final Status status;
    private final TaskPriority priority;
    private final Long projectId;
    private final ProjectMemberResponse assignee;
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
            User assigneeUser = task.getAssignee();
            ProjectMember memberInfo = assigneeUser.getProjectMemberships().stream()
                    .filter(m -> m.getProject().getId().equals(task.getProject().getId()))
                    .findFirst()
                    .orElse(null);

            this.assignee = new ProjectMemberResponse(
                    assigneeUser.getId(),
                    assigneeUser.getName(),
                    assigneeUser.getEmail(),
                    memberInfo != null ? memberInfo.getRole() : null, // 역할 정보 설정
                    Optional.ofNullable(assigneeUser.getUserProfile())
                            .map(UserProfile::getAvatarUrl)
                            .orElse(null)
            );
        } else {
            this.assignee = null;
        }

        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
    }
}