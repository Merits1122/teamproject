package com.example.backend.service;

import com.example.backend.dto.InviteUserRequest;
import com.example.backend.dto.ProjectMemberResponse;
import com.example.backend.entity.Project;
import com.example.backend.entity.User;
import com.example.backend.entity.UserProfile;
import com.example.backend.entity.project.ProjectInvitationStatus;
import com.example.backend.entity.project.ProjectMember;
import com.example.backend.entity.project.ProjectRole;
import com.example.backend.repository.ProjectMemberRepository;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
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

    @Value("${frontend.accept-invitation.url}")
    private String acceptInvitationUrlBase;

    public ProjectMemberService(ProjectMemberRepository projectMemberRepository,
                                ProjectRepository projectRepository,
                                UserRepository userRepository,
                                @Qualifier("emailServiceImpl") EmailService emailService) {
        this.projectMemberRepository = projectMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
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
        Optional<User> existingUserOpt = userRepository.findByEmail(inviteeEmail);

        User existingUserByEmail = userRepository.findByEmail(inviteeEmail).orElse(null);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            projectMemberRepository.findByProjectAndUser(project, existingUser)
                    .ifPresent(existingMember -> {
                        if (existingMember.getInvitationStatus() == ProjectInvitationStatus.ACCEPTED) {
                            throw new DataIntegrityViolationException("이미 해당 프로젝트의 멤버입니다.");
                        } else if (existingMember.getInvitationStatus() == ProjectInvitationStatus.PENDING) {
                            logger.info("기존에 대기 중인 초대(ID: {})를 삭제하고 새로 생성합니다.", existingMember.getId());
                            projectMemberRepository.delete(existingMember);
                            projectMemberRepository.flush(); // 즉시 삭제 쿼리 실행
                        }
                    });
        } else {
            projectMemberRepository.findByProjectAndInvitedEmailAndInvitationStatus(project, inviteeEmail, ProjectInvitationStatus.PENDING)
                    .ifPresent(pendingInvitation -> {
                        logger.info("기존에 대기 중인 초대(ID: {})를 삭제하고 새로 생성합니다.", pendingInvitation.getId());
                        projectMemberRepository.delete(pendingInvitation);
                        projectMemberRepository.flush();
                    });
        }

        String invitationToken = UUID.randomUUID().toString();
        ProjectMember newInvitation = ProjectMember.builder()
                .project(project)
                .invitedEmail(inviteeEmail)
                .user(existingUserOpt.orElse(null))
                .role(roleToAssign)
                .invitationToken(invitationToken)
                .invitationTokenExpiry(LocalDateTime.now().plusDays(7))
                .invitationStatus(ProjectInvitationStatus.PENDING)
                .build();
        projectMemberRepository.save(newInvitation);
        logger.info("초대 토큰 생성 및 저장 완료: [{}], 사용자: '{}', 프로젝트 ID: {}", invitationToken, inviteeEmail, projectId);

        String inviterDisplayName = inviter.getName() != null && !inviter.getName().isEmpty() ? inviter.getName() : inviter.getEmail();
        emailService.sendProjectInvitationEmail(inviteeEmail, project.getName(), inviterDisplayName, acceptInvitationUrlBase + "?token=" + invitationToken);
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
        logger.info("사용자 {}이 프로젝트 참가 수락 : {}", acceptingUser.getEmail(), invitation.getProject().getName());
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

        projectMemberRepository.delete(memberToRemove);
        logger.info("관리자 {}이 사용자 {}을 project {}에서 삭제", adminUser.getEmail(), memberToRemove.getUser().getEmail(), project.getName());
    }

    //권환
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