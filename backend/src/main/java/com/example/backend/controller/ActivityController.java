package com.example.backend.controller;

import com.example.backend.dto.ActivityLogResponse;
import com.example.backend.entity.user.User;
import com.example.backend.service.ActivityLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ActivityController {

    private final ActivityLogService activityLogService;

    public ActivityController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping("/projects/{projectId}/activitylog")
    public ResponseEntity<List<ActivityLogResponse>> getActivityLogs(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {

        List<ActivityLogResponse> activities = activityLogService.getActivityLogsForProject(projectId, currentUser);
        return ResponseEntity.ok(activities);
    }
    @GetMapping("/dashboard/activitylog")
    public ResponseEntity<List<ActivityLogResponse>> getRecentActivityLogs(@AuthenticationPrincipal User currentUser) {
        List<ActivityLogResponse> recentActivities = activityLogService.getRecentActivityLogsForUser(currentUser, 5);
        return ResponseEntity.ok(recentActivities);
    }
}