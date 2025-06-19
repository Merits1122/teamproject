package com.example.backend.controller;

import com.example.backend.dto.AcceptInvitationRequest;
import com.example.backend.entity.user.User;
import com.example.backend.service.ProjectMemberService;
import com.example.backend.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;



@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private static final Logger logger = LoggerFactory.getLogger(InvitationController.class);
    private final ProjectMemberService projectMemberService;
    private final UserService userService;

    public InvitationController(ProjectMemberService projectMemberService,
                                UserService userService) {
        this.projectMemberService = projectMemberService;
        this.userService = userService;
    }

    //초대 수락 처리
    @PostMapping("/accept")
    public ResponseEntity<String> acceptInvitation(
            @Valid @RequestBody AcceptInvitationRequest acceptRequest,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("초대를 수락하려면 로그인이 필요합니다.");
        }
        try {
            User acceptingUser = userService.getCurrentAuthenticatedUser();
            logger.info("사용자 '{}'가 초대 수락 시도 | 토큰: {}", acceptingUser.getEmail(), acceptRequest.getToken());

            projectMemberService.acceptProjectInvitation(acceptRequest.getToken(), acceptingUser);

            return ResponseEntity.ok("프로젝트 초대가 성공적으로 수락되었습니다.");
        } catch (EntityNotFoundException e) {
            logger.warn("초대 수락 실패 (토큰 없음) | 토큰: {}, 원인: {}", acceptRequest.getToken(), e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException | IllegalArgumentException e) {
            logger.warn("초대 수락 실패 (잘못된 요청) | 토큰: {}, 원인: {}", acceptRequest.getToken(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("초대 수락 실패 (권한 없음) | 토큰: {}, 원인: {}", acceptRequest.getToken(), e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("초대 수락 처리 중 예기치 않은 오류 발생 | 토큰: {}", acceptRequest.getToken(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("초대 수락 처리 중 서버에 문제가 발생했습니다.");
        }
    }
}