package com.example.backend.service;

import com.example.backend.dto.InvitationDetailsResponse;
import com.example.backend.dto.InviteUserRequest;
import com.example.backend.dto.ProjectMemberResponse;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.entity.user.UserProfile;
import com.example.backend.entity.project.ProjectInvitationStatus;
import com.example.backend.entity.project.ProjectMember;
import com.example.backend.entity.project.ProjectRole;
import com.example.backend.repository.ProjectMemberRepository;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectMemberService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectMemberService.class);

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final TaskRepository taskRepository;
    private ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final SseService sseService;

    @Value("${frontend.accept-invitation.url}")
    private String acceptInvitationUrlBase;

    public ProjectMemberService(ProjectMemberRepository projectMemberRepository,
                                ProjectRepository projectRepository,
                                UserRepository userRepository,
                                @Qualifier("emailServiceImpl") EmailService emailService,
                                TaskRepository taskRepository,
                                NotificationService notificationService,
                                SseService sseService) {
        this.projectMemberRepository = projectMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
        this.sseService = sseService;
    }

    @Autowired
    public void setActivityLogService(@Lazy ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    public void addProjectCreatorAsAdmin(Project project, User creator) {
        ProjectMember creatorMembership = ProjectMember.builder()
                .project(project)
                .user(creator)
                .role(ProjectRole.ADMIN)
                .invitationStatus(ProjectInvitationStatus.ACCEPTED)
                .joinedAt(LocalDateTime.now())
                .build();
        projectMemberRepository.save(creatorMembership);
        logger.info("사용자 {}이 프로젝트 {}의 관리자가 됨", creator.getEmail(), project.getId());
    }

    @Transactional(readOnly = true)
    public List<Project> getAcceptedProjectsForUser(User currentUser) {
        return projectMemberRepository.findByUserAndInvitationStatus(currentUser, ProjectInvitationStatus.ACCEPTED)
                .stream()
                .map(ProjectMember::getProject)
                .collect(Collectors.toList());
    }

    //프로젝트 초대
    public void inviteUserToProject(Long projectId, InviteUserRequest inviteRequest, User inviter) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        ensureUserIsAdminOfProject(project, inviter);

        String inviteeEmail = inviteRequest.getEmail().trim();
        ProjectRole roleToAssign = inviteRequest.getRole();

        if (roleToAssign == ProjectRole.ADMIN) {
            throw new IllegalArgumentException("초대 시 ADMIN 역할을 직접 부여할 수 없습니다.");
        }
        if (inviter.getEmail().equalsIgnoreCase(inviteeEmail)) {
            throw new IllegalArgumentException("자기 자신을 프로젝트에 초대할 수 없습니다.");
        }

        projectMemberRepository.findByProjectIdAndInvitedEmail(projectId, inviteeEmail).ifPresent(existing -> {
            if (existing.getInvitationStatus() == ProjectInvitationStatus.ACCEPTED) {
                throw new DataIntegrityViolationException("'" + inviteeEmail + "'님은 이미 해당 프로젝트의 멤버입니다.");
            }
            if (existing.getInvitationStatus() == ProjectInvitationStatus.PENDING || existing.getInvitationStatus() == ProjectInvitationStatus.DECLINED) {
                logger.info("기존의 초대(ID: {})를 삭제하고 새로 생성합니다.", existing.getId());
                projectMemberRepository.delete(existing);
                projectMemberRepository.flush();
            }
        });

        Optional<User> userToInviteOpt = userRepository.findByEmail(inviteeEmail);
        String invitationToken = UUID.randomUUID().toString();

        ProjectMember newInvitation = ProjectMember.builder()
                .project(project)
                .invitedEmail(inviteeEmail)
                .user(userToInviteOpt.orElse(null))
                .role(roleToAssign)
                .invitationToken(invitationToken)
                .invitationTokenExpiry(LocalDateTime.now().plusDays(7))
                .invitationStatus(ProjectInvitationStatus.PENDING)
                .build();
        projectMemberRepository.save(newInvitation);

        String inviteeIdentifier = userToInviteOpt.map(User::getName).orElse(inviteeEmail);

        String message = String.format("<strong>%s</strong>님이 <strong>%s</strong>님을 프로젝트에 초대했습니다.", inviter.getName(), inviteeIdentifier);
        activityLogService.createLog(project, inviter, message, ActivityLogType.MEMBER_INVITED);

        String invitationLink = acceptInvitationUrlBase + "?token=" + invitationToken;

        if (userToInviteOpt.isPresent()) {
            User invitedUser = userToInviteOpt.get();
            if (!invitedUser.getId().equals(inviter.getId())) {
                String notificationMessage = String.format("<strong>%s</strong>님이 당신을 <strong>'%s'</strong> 프로젝트에 초대했습니다.",
                        inviter.getName(), project.getName());
                notificationService.createAndSendNotification(invitedUser, NotificationType.PROJECT_INVITATION, notificationMessage, invitationLink, inviter);
            }
        } else {
            emailService.sendProjectInvitationEmail(inviteeEmail, project.getName(), inviter.getName(), invitationLink);
        }
        sseService.broadcastToProjectMembers(projectId, "project-updated", Map.of("projectId", projectId));
    }

    //프로젝트 초대 수락
    @Transactional
    public void acceptProjectInvitation(String token, User acceptingUser) {
        logger.info("초대 수락 시도 | 사용자: {}, 토큰: {}", acceptingUser.getEmail(), token);

        ProjectMember invitation = projectMemberRepository.findByInvitationToken(token)
                .orElseThrow(() -> new EntityNotFoundException("유효하지 않거나 만료된 초대 토큰입니다."));

        if (invitation.getInvitationStatus() != ProjectInvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리되었거나 유효하지 않은 초대입니다.");
        }
        if (invitation.getInvitationTokenExpiry().isBefore(LocalDateTime.now())) {
            invitation.setInvitationStatus(ProjectInvitationStatus.DECLINED);
            projectMemberRepository.save(invitation);
            throw new IllegalArgumentException("초대 토큰이 만료되었습니다.");
        }

        if (!invitation.getInvitedEmail().equalsIgnoreCase(acceptingUser.getEmail())) {
            throw new AccessDeniedException("초대 대상 이메일(" + invitation.getInvitedEmail() + ")과 현재 사용자 이메일(" + acceptingUser.getEmail() + ")이 일치하지 않습니다.");
        }

        if (invitation.getUser() == null) {
            invitation.setUser(acceptingUser);
        } else if (!invitation.getUser().getId().equals(acceptingUser.getId())) {
            throw new AccessDeniedException("초대 대상 사용자가 일치하지 않습니다.");
        }

        projectMemberRepository.findByProjectAndUserAndInvitationStatus(invitation.getProject(), acceptingUser, ProjectInvitationStatus.ACCEPTED)
                .ifPresent(existingAcceptedMembership -> {
                    logger.warn("사용자 {}은 이미 멤버,", acceptingUser.getEmail());
                    if (existingAcceptedMembership.getRole() != invitation.getRole()) {
                        existingAcceptedMembership.setRole(invitation.getRole());
                        projectMemberRepository.save(existingAcceptedMembership);
                    }
                });

        invitation.setUser(acceptingUser);
        invitation.setInvitationStatus(ProjectInvitationStatus.ACCEPTED);
        invitation.setJoinedAt(LocalDateTime.now());
        invitation.setInvitationToken(null);
        invitation.setInvitationTokenExpiry(null);
        projectMemberRepository.save(invitation);
        sseService.broadcastToProjectMembers(invitation.getProject().getId(), "project-updated", Map.of("projectId", invitation.getProject().getId()));
        String message = String.format("<strong>%s</strong>님이 프로젝트 초대를 수락했습니다.", acceptingUser.getName());
        activityLogService.createLog(invitation.getProject(), acceptingUser, message, ActivityLogType.MEMBER_JOINED);
        logger.info("사용자 {}이 프로젝트 참가 수락 : {}", acceptingUser.getEmail(), invitation.getProject().getName());
    }

    @Transactional(readOnly = true)
    public InvitationDetailsResponse getInvitationDetails(String token) {
        ProjectMember invitation = projectMemberRepository.findByInvitationToken(token)
                .orElseThrow(() -> new EntityNotFoundException("유효하지 않거나 만료된 초대 토큰입니다."));
        return new InvitationDetailsResponse(invitation);
    }

    //초대 거절
    @Transactional
    public void declineProjectInvitation(String token, User currentUser) {
        ProjectMember invitation = projectMemberRepository.findByInvitationToken(token)
                .orElseThrow(() -> new EntityNotFoundException("유효하지 않거나 만료된 초대 토큰입니다."));

        invitation.setInvitationStatus(ProjectInvitationStatus.DECLINED);
        projectMemberRepository.save(invitation);
    }

    //프로젝트 멤버 목록
    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getProjectMembers(Long projectId, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        ensureUserCanReadProject(project, currentUser);

        return projectMemberRepository.findByProjectAndInvitationStatus(project, ProjectInvitationStatus.ACCEPTED)
                .stream()
                .filter(member -> member.getUser() != null)
                .map(member -> {
                    User user = member.getUser();
                    String avatarUrl = Optional.ofNullable(user.getUserProfile())
                            .map(UserProfile::getAvatarUrl)
                            .orElse(null);

                    return new ProjectMemberResponse(
                            user.getId(), user.getName(), user.getEmail(), member.getRole(), avatarUrl
                    );
                })
                .collect(Collectors.toList());
    }

    //역할 변경
    public void changeMemberRole(Long projectId, Long memberUserId, ProjectRole newRole, User adminUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));
        ensureUserIsAdminOfProject(project, adminUser);

        ProjectMember memberToUpdate = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .filter(member -> member.getInvitationStatus() == ProjectInvitationStatus.ACCEPTED)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트에서 해당 멤버를 찾을 수 없습니다: User ID " + memberUserId));

        // 자기 자신의 역할을 변경하는 경우 (ADMIN이 한 명일 경우)
        if (adminUser.getId().equals(memberUserId) && newRole != ProjectRole.ADMIN) {
            long adminCount = projectMemberRepository.countByProjectAndRoleAndInvitationStatus(project, ProjectRole.ADMIN, ProjectInvitationStatus.ACCEPTED);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("프로젝트에는 최소 한 명의 ADMIN이 있어야 합니다. 자신의 역할을 변경할 수 없습니다.");
            }
        }

        memberToUpdate.setRole(newRole);
        projectMemberRepository.save(memberToUpdate);
        String message = String.format("<strong>%s</strong>님이 <strong>%s</strong>님의 역할을 <strong>%s</strong>(으)로 변경했습니다.",
                adminUser.getName(), memberToUpdate.getUser().getName(), newRole);
        activityLogService.createLog(project, adminUser, message, ActivityLogType.MEMBER_ROLE_CHANGED);
        logger.info("ADMIN {}이 멤버 {}의 역할을 {}으로 변경", adminUser.getEmail(), memberToUpdate.getUser().getEmail(), newRole);
    }

    //멤버 삭제
    public void removeMemberFromProject(Long projectId, Long memberUserId, User adminUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));
        ensureUserIsAdminOfProject(project, adminUser);

        ProjectMember memberToRemove = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트에서 해당 멤버를 찾을 수 없습니다: User ID " + memberUserId));

        if (memberToRemove.getUser().getId().equals(adminUser.getId())) {
            long adminCount = projectMemberRepository.countByProjectAndRoleAndInvitationStatus(project, ProjectRole.ADMIN, ProjectInvitationStatus.ACCEPTED);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("프로젝트에는 최소 한 명의 ADMIN이 있어야 합니다. 자기 자신을 추방할 수 없습니다.");
            }
        }
        if (memberToRemove.getUser().getId().equals(project.getCreator().getId())) {
            throw new IllegalArgumentException("프로젝트 생성자는 추방할 수 없습니다. 역할을 변경하거나 프로젝트를 삭제하세요.");
        }

        User userToRemove = memberToRemove.getUser();
        List<Task> assignedTasks = taskRepository.findByProjectAndAssignee(project, userToRemove);

        if (!assignedTasks.isEmpty()) {
            logger.info("'{}' 프로젝트에서 사용자 '{}'에게 할당된 {}개의 업무를 '미배정'으로 변경합니다.", project.getName(), userToRemove.getEmail(), assignedTasks.size());
            for (Task task : assignedTasks) {
                task.setAssignee(null);
            }
            taskRepository.saveAll(assignedTasks);
        }
        projectMemberRepository.delete(memberToRemove);
        String message = String.format("<strong>%s</strong>님이 <strong>%s</strong>님을 프로젝트에서 제외했습니다.",
                adminUser.getName(), memberToRemove.getUser().getName());
        activityLogService.createLog(project, adminUser, message, ActivityLogType.MEMBER_REMOVED);
        sseService.broadcastToProjectMembers(projectId, "project-updated", Map.of("projectId", projectId));
        logger.info("관리자 {}이 사용자 {}을 project {}에서 삭제", adminUser.getEmail(), memberToRemove.getUser().getEmail(), project.getName());
    }

    //권한
    public void ensureUserIsMemberOfProject(Project project, User user) {
        boolean isMember = projectMemberRepository.findByProjectAndUserAndInvitationStatus(
                project,
                user,
                ProjectInvitationStatus.ACCEPTED
        ).isPresent();

        if (!isMember) {
            logger.warn("권한 없는 접근 시도 | 사용자: {}, 프로젝트: {}", user.getEmail(), project.getName());
            throw new AccessDeniedException("이 프로젝트의 멤버가 아니므로 접근할 수 없습니다.");
        }
    }

    @Transactional(readOnly = true)
    public ProjectRole getUserRoleInProject(Project project, User user) {
        return projectMemberRepository.findByProjectIdAndUserId(project.getId(), user.getId())
                .map(ProjectMember::getRole)
                .orElse(null);
    }

    public void ensureUserCanModifyTasksInProject(Project project, User user) {
        logger.debug("업무 수정/생성 권한 확인 | 사용자: {}, 프로젝트: '{}'", user.getEmail(), project.getName());

        ProjectMember member = projectMemberRepository.findByProjectAndUserAndInvitationStatus(
                        project, user, ProjectInvitationStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException("이 프로젝트의 멤버가 아니므로 작업을 수행할 수 없습니다."));

        if (member.getRole() == ProjectRole.VIEWER) {
            throw new AccessDeniedException("뷰어(Viewer) 권한으로는 작업을 생성하거나 수정할 수 없습니다.");
        }
    }

    public void ensureUserIsAdminOfProject(Project project, User user) {
        logger.debug("ADMIN 권한 확인 | 사용자: {}, 프로젝트: '{}'", user.getEmail(), project.getName());
        projectMemberRepository.findByProjectAndUserAndRoleAndInvitationStatus(
                        project, user, ProjectRole.ADMIN, ProjectInvitationStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException("이 작업을 수행할 ADMIN 권한이 없습니다."));
    }

    public void ensureUserCanReadProject(Project project, User user) {
        logger.debug("프로젝트 읽기 권한 확인 | 사용자: {}, 프로젝트: '{}'", user.getEmail(), project.getName());

        if (project.getCreator().getId().equals(user.getId())) {
            return;
        }
        projectMemberRepository.findByProjectAndUserAndInvitationStatus(
                        project, user, ProjectInvitationStatus.ACCEPTED)
                .orElseThrow(() -> new AccessDeniedException("이 프로젝트에 접근할 권한이 없습니다."));
    }
}