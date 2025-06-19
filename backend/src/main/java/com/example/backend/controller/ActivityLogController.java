package com.example.backend.controller;

import com.example.backend.entity.project.Project;
import com.example.backend.entity.user.User;
import com.example.backend.dto.ActivityLogResponse;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard/project/{projectId}/activity-logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ActivityLogResponse>> getLogs(
            @PathVariable Long projectId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("인증된 사용자 정보를 찾을 수 없습니다."));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("해당 프로젝트를 찾을 수 없습니다."));

        List<ActivityLogResponse> logs = activityLogService.getActivityLogsByProject(project);
        return ResponseEntity.ok(logs);
    }
}