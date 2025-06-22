package com.example.backend.repository;

import com.example.backend.entity.project.ProjectInvitationStatus;
import com.example.backend.entity.project.ProjectMember;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.user.User;
import com.example.backend.entity.project.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);
    Optional<ProjectMember> findByInvitationToken(String token);
    List<ProjectMember> findByUserAndInvitationStatus(User user, ProjectInvitationStatus status);
    long countByProjectAndRoleAndInvitationStatus(Project project, ProjectRole role, ProjectInvitationStatus status);
    Optional<ProjectMember> findByProjectAndUserAndRoleAndInvitationStatus(Project project, User user, ProjectRole role, ProjectInvitationStatus status);
    Optional<ProjectMember> findByProjectAndUserAndInvitationStatus(Project project, User user, ProjectInvitationStatus status);
    List<ProjectMember> findByProjectAndInvitationStatus(Project project, ProjectInvitationStatus status);
    List<ProjectMember> findByProjectIdAndInvitationStatus(Long projectId, ProjectInvitationStatus status);
    Optional<ProjectMember> findByProjectIdAndInvitedEmail(Long projectId, String invitedEmail);
}