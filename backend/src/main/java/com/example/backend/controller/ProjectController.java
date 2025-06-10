package com.example.backend.controller;

import com.example.backend.dto.*;
import com.example.backend.entity.User;
import com.example.backend.service.ProjectMemberService;
import com.example.backend.service.ProjectService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private static final Logger logger = LoggerFactory.getLogger(ProjectController.class);

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    public ProjectController(ProjectService projectService,
                             ProjectMemberService projectMemberService) {
        this.projectService = projectService;
        this.projectMemberService = projectMemberService;
    }

    //프로젝트 생성
    @PostMapping
    public ResponseEntity<?> createProject(
            @Valid @RequestBody ProjectRequest projectRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로젝트를 생성하려면 로그인이 필요합니다.");
        }
        try {
            ProjectResponse response = projectService.createProject(projectRequest, currentUser);
            logger.info("사용자 '{}'가 프로젝트 '{}' 생성 성공", currentUser.getEmail(), response.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            logger.error("프로젝트 생성 중 오류 발생 | 요청자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로젝트 생성 중 내부 서버 오류가 발생했습니다.");
        }
    }

    //프로젝트 전체 목록
    @GetMapping
    public ResponseEntity<?> getMyProjects(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로젝트 목록을 조회하려면 로그인이 필요합니다.");
        }
        try {
            List<ProjectResponse> projects = projectService.getMyProjects(currentUser);
            logger.info("사용자 '{}'의 프로젝트 목록 조회 성공", currentUser.getEmail());
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            logger.error("프로젝트 목록 조회 중 오류 발생 | 요청자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로젝트 목록 조회 중 오류가 발생했습니다.");
        }
    }

    //프로젝트 상세 조회
    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProjectById(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로젝트를 조회하려면 로그인이 필요합니다.");
        }
        try {
            ProjectResponse project = projectService.getProjectById(projectId, currentUser);
            logger.info("사용자 '{}'의 프로젝트 ID {} 상세 조회 성공", currentUser.getEmail(), projectId);
            return ResponseEntity.ok(project);
        } catch (EntityNotFoundException e) {
            logger.warn("프로젝트 조회 실패 (Not Found) | 요청자: {}, 프로젝트 ID: {}", currentUser.getEmail(), projectId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("프로젝트 접근 거부 | 요청자: {}, 프로젝트 ID: {}", currentUser.getEmail(), projectId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("프로젝트 상세 조회 중 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로젝트 조회 중 내부 서버 오류 발생");
        }
    }

    //프로젝트 수정
    /*
    @PutMapping("/{projectId}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectRequest projectRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로젝트를 수정하려면 로그인이 필요합니다.");
        }
        try {
            ProjectResponse updatedProject = projectService.updateProject(projectId, projectRequest, currentUser);
            logger.info("사용자 '{}'가 프로젝트 ID {} 수정 성공", currentUser.getEmail(), projectId);
            return ResponseEntity.ok(updatedProject);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("프로젝트 수정 중 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로젝트 수정 중 오류가 발생했습니다.");
        }
    }*/

    //프로젝트 삭제
    @DeleteMapping("/{projectId}")
    public ResponseEntity<String> deleteProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로젝트를 삭제하려면 로그인이 필요합니다.");
        }
        try {
            projectService.deleteProject(projectId, currentUser);
            logger.info("사용자 '{}'가 프로젝트 ID {} 삭제 성공", currentUser.getEmail(), projectId);
            return ResponseEntity.ok("프로젝트가 성공적으로 삭제되었습니다.");
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("프로젝트 삭제 중 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로젝트 삭제 중 오류가 발생했습니다.");
        }
    }

    //프로젝트 초대
    @PostMapping("/{projectId}/invitations")
    public ResponseEntity<String> inviteUserToProject(
            @PathVariable Long projectId,
            @Valid @RequestBody InviteUserRequest inviteUserRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            projectMemberService.inviteUserToProject(projectId, inviteUserRequest, currentUser);
            return ResponseEntity.ok().body("사용자 초대가 성공적으로 발송되었습니다.");
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 해당 프로젝트의 멤버인 사용자입니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("프로젝트 멤버 초대 중 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("사용자 초대 중 서버 오류가 발생했습니다.");
        }
    }
}