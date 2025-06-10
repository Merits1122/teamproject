package com.example.backend.controller;

import com.example.backend.dto.TaskRequest;
import com.example.backend.dto.TaskResponse;
import com.example.backend.service.TaskService;
import com.example.backend.entity.User;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private static final Logger logger = LoggerFactory.getLogger(TaskController.class);
    private final TaskService taskService;

    //업무 생성
    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<?> createTask(
            @PathVariable Long projectId,
            @Valid @RequestBody TaskRequest requestDto,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            TaskResponse responseDto = taskService.createTask(projectId, requestDto, currentUser);
            logger.info("업무 생성 성공 | 프로젝트 ID: {}, 생성자: {}", projectId, currentUser.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("업무 생성 중 서버 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("업무 생성 중 오류가 발생했습니다.");
        }
    }

    //업무 조회
    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<?> getTasksByProjectId(@PathVariable Long projectId,
                                                 @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            List<TaskResponse> tasks = taskService.getTasksByProjectId(projectId, currentUser);
            return ResponseEntity.ok(tasks);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("프로젝트 업무 목록 조회 중 서버 오류 발생 | 프로젝트 ID: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("업무 목록 조회 중 오류가 발생했습니다.");
        }
    }

    //업무 수정
    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable Long taskId,
                                                   @Valid @RequestBody TaskRequest taskRequest,
                                                   @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            TaskResponse updatedTask = taskService.updateTask(taskId, taskRequest, currentUser);
            return ResponseEntity.ok(updatedTask);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("업무 수정 중 서버 오류 발생 | 업무 ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("업무 수정 중 오류가 발생했습니다.");
        }
    }

    //업무 삭제
    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable Long taskId,
                                        @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            taskService.deleteTask(taskId, currentUser);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("업무 삭제 중 서버 오류 발생 | 업무 ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("업무 삭제 중 오류가 발생했습니다.");
        }
    }
}