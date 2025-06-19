package com.example.backend.controller;

import com.example.backend.dto.ChangeRoleRequest;
import com.example.backend.dto.ProjectMemberResponse;
import com.example.backend.entity.user.User;
import com.example.backend.service.ProjectMemberService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
public class ProjectMemberController {

    private static final Logger logger = LoggerFactory.getLogger(ProjectMemberController.class);

    private final ProjectMemberService projectMemberService;

    public ProjectMemberController(ProjectMemberService projectMemberService) {
        this.projectMemberService = projectMemberService;
    }

    //멤버 조회
    @GetMapping
    public ResponseEntity<?> getProjectMembers(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            List<ProjectMemberResponse> members = projectMemberService.getProjectMembers(projectId, currentUser);
            logger.info("프로젝트 ID {}의 멤버 목록 조회 성공 | 요청자: {}", projectId, currentUser.getEmail());
            return ResponseEntity.ok(members);
        } catch (EntityNotFoundException e) {
            logger.warn("멤버 목록 조회 실패 (Not Found) | 프로젝트 ID: {}, 원인: {}", projectId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("멤버 목록 조회 권한 없음 | 프로젝트 ID: {}, 요청자: {}", projectId, currentUser.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("멤버 목록 조회 중 서버 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("멤버 목록 조회 중 오류가 발생했습니다.");
        }
    }

    //역할 변경(admin만)
    @PutMapping("/{memberUserId}/role")
    public ResponseEntity<String> changeMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long memberUserId,
            @Valid @RequestBody ChangeRoleRequest changeRoleRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            projectMemberService.changeMemberRole(projectId, memberUserId, changeRoleRequest.getRole(), currentUser);
            logger.info("멤버 역할 변경 성공 | 프로젝트 ID: {}, 대상 멤버 ID: {}, 요청자: {}", projectId, memberUserId, currentUser.getEmail());
            return ResponseEntity.ok("멤버 역할이 성공적으로 변경되었습니다.");
        } catch (EntityNotFoundException e) {
            logger.warn("멤버 역할 변경 실패 (Not Found) | 프로젝트 ID: {}, 대상 멤버 ID: {}, 원인: {}", projectId, memberUserId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("멤버 역할 변경 권한 없음 | 프로젝트 ID: {}, 요청자: {}", projectId, currentUser.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.warn("멤버 역할 변경 실패 (Bad Request) | 프로젝트 ID: {}, 원인: {}", projectId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("멤버 역할 변경 중 서버 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("멤버 역할 변경 중 오류가 발생했습니다.");
        }
    }

    //멤버 삭제(admin)
    @DeleteMapping("/{memberUserId}")
    public ResponseEntity<String> removeMemberFromProject(
            @PathVariable Long projectId,
            @PathVariable Long memberUserId,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            projectMemberService.removeMemberFromProject(projectId, memberUserId, currentUser);
            logger.info("멤버 삭제 성공 | 프로젝트 ID: {}, 대상 멤버 ID: {}, 요청자: {}", projectId, memberUserId, currentUser.getEmail());
            return ResponseEntity.ok("멤버가 프로젝트에서 성공적으로 삭제되었습니다.");
        } catch (EntityNotFoundException e) {
            logger.warn("멤버 삭제 실패 (Not Found) | 프로젝트 ID: {}, 대상 멤버 ID: {}, 원인: {}", projectId, memberUserId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("멤버 삭제 권한 없음 | 프로젝트 ID: {}, 요청자: {}", projectId, currentUser.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.warn("멤버 삭제 실패 (Bad Request) | 프로젝트 ID: {}, 원인: {}", projectId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("멤버 삭제 중 서버 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("멤버 삭제 중 오류가 발생했습니다.");
        }
    }
}