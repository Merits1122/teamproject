package com.example.backend.dto;

import com.example.backend.entity.Project;
import com.example.backend.entity.Status;
import com.example.backend.entity.User;
import com.example.backend.entity.UserProfile;
import com.example.backend.entity.project.ProjectInvitationStatus;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Getter
@Setter
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private LocalDate endDate;
    private Status status;
    private String creatorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TaskResponse> tasks;
    private List<ProjectMemberResponse> members;
    private int memberCount;

    public ProjectResponse(Project project) {
        this.id = project.getId();
        this.name = project.getName();
        this.description = project.getDescription();
        this.endDate = project.getEndDate();
        this.status = project.getStatus();
        if (project.getCreator() != null) {
            this.creatorUsername = project.getCreator().getName();
        }
        this.createdAt = project.getCreatedAt();
        this.updatedAt = project.getUpdatedAt();
        this.tasks = project.getTasks() != null ?
                project.getTasks().stream()
                        .map(TaskResponse::new)
                        .collect(Collectors.toList())
                : Collections.emptyList();

        if (project.getMembers() != null) {
            this.members = project.getMembers().stream()
                    .filter(member -> member.getInvitationStatus() == ProjectInvitationStatus.ACCEPTED && member.getUser() != null)
                    .map(member -> {
                        User user = member.getUser();
                        String avatarUrl = Optional.ofNullable(user.getUserProfile())
                                .map(UserProfile::getAvatarUrl)
                                .orElse(null);

                        return new ProjectMemberResponse(
                                user.getId(),
                                user.getName(),
                                user.getEmail(),
                                member.getRole(),
                                avatarUrl
                        );
                    })
                    .collect(Collectors.toList());
            this.memberCount = this.members.size();
        } else {
            this.members = Collections.emptyList();
            this.memberCount = 0;
        }
    }
}