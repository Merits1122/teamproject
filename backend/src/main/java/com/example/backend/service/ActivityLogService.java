package com.example.backend.service;

import com.example.backend.dto.ActivityLogResponse;
import com.example.backend.entity.activitylog.ActivityLog;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.user.User;
import com.example.backend.repository.ActivityLogRepository;
import com.example.backend.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberService projectMemberService;

    // 활동 로그 생성
    public void createLog(Project project, User user, String message, ActivityLogType type) {
        ActivityLog log = new ActivityLog(message, user, project, type);
        activityLogRepository.save(log);
    }

    // 특정 프로젝트의 활동 로그 목록 조회
    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getActivityLogsForProject(Long projectId, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserIsMemberOfProject(project, currentUser);

        List<ActivityLog> activities = activityLogRepository.findByProjectOrderByCreatedAtDesc(project);

        return activities.stream()
                .map(ActivityLogResponse::new)
                .collect(Collectors.toList());
    }

    //최근 활동 로그
    public List<ActivityLogResponse> getRecentActivityLogsForUser(User currentUser, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<ActivityLog> activities = activityLogRepository.findRecentActivitiesByUserId(currentUser.getId(), pageable);
        return activities.stream()
                .map(ActivityLogResponse::new)
                .collect(Collectors.toList());
    }
}