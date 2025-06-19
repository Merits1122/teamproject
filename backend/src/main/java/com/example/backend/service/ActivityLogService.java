package com.example.backend.service;

import com.example.backend.entity.activity.ActivityLog;
import com.example.backend.entity.activity.ActivityType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.dto.ActivityLogResponse;
import com.example.backend.repository.ActivityLogRepository;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final ProjectRepository projectRepository;

    //댓글 작성
    public void logCommentCreation(User user, Task task) {
        String message = String.format("[프로젝트: %s] 업무 '%s'에 댓글을 작성했습니다.",
                task.getProject().getName(), task.getTitle());
        ActivityLog log = ActivityLog.builder()
                .user(user)
                .task(task)
                .project(task.getProject())
                .type(ActivityType.COMMENT)
                .action("댓글 작성")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        System.out.println("[디버그] 활동 로그 저장 중: " + log.getMessage());
        activityLogRepository.save(log);
    }


    public List<ActivityLogResponse> getActivityLogsByProject(Project project) {
        List<ActivityLog> logs = activityLogRepository.findByProject(project);

        return logs.stream()
                .map(ActivityLogResponse::from)
                .collect(Collectors.toList());
    }

    // 업무 할당
    public void logAssignment(User user, Task task) {
        System.out.println("[디버그] 활동 로그 생성 시작");

        String projectName = task.getProject() != null ? task.getProject().getName() : "알 수 없는 프로젝트";
        String taskTitle = task.getTitle() != null ? task.getTitle() : "알 수 없는 업무";
        String message = String.format("[프로젝트: %s] %s 님이 업무 '%s'를 할당하였습니다.", projectName, user.getName(), taskTitle);

        ActivityLog log = ActivityLog.builder()
                .user(user)
                .task(task)
                .project(task.getProject())
                .type(ActivityType.TASK_ASSIGN)
                .action("업무 할당")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        System.out.println("[디버그] 활동 로그 저장 중: " + log.getMessage());
        activityLogRepository.save(log);
    }

    // 업무 완료
    public void logTaskCompletion(User user, Task task) {
        System.out.println("[디버그] 활동 로그 생성 시작");

        String projectName = task.getProject() != null ? task.getProject().getName() : "알 수 없는 프로젝트";
        String taskTitle = task.getTitle() != null ? task.getTitle() : "알 수 없는 업무";
        String message = String.format("[프로젝트: %s] %s 님이 업무 '%s'를 완료하였습니다.", projectName, user.getName(), taskTitle);

        ActivityLog log = ActivityLog.builder()
                .user(user)
                .task(task)
                .project(task.getProject())
                .type(ActivityType.TASK_COMPLETE)
                .action("업무 완료")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        System.out.println("[디버그] 활동 로그 저장 중: " + log.getMessage());
        activityLogRepository.save(log);
    }


    //프로젝트 참가
    public void logProjectJoin(User user, Project project) {
        if (user == null || project == null) {
            System.out.println("❌ user 또는 project가 null입니다.");
            return;
        }
        project = projectRepository.findById(project.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));
        String message = user.getName() + " 님이 프로젝트 [" + project.getName() + "] 에 참가하였습니다.";

        ActivityLog log = ActivityLog.builder()
                .user(user)
                .project(project)
                .type(ActivityType.PROJECT_JOIN)
                .action("프로젝트 참여")
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        activityLogRepository.save(log);
        System.out.println("✅ 프로젝트 참가 활동 로그 저장 완료: " + message);
    }

    //활동로그 필터링 전용 로직 프론트와 연결 필요
    public List<ActivityLog> getActivityLogsByType(ActivityType type) {
        if (type == null) {
            // 타입 지정이 없으면 전체 로그 반환
            return activityLogRepository.findAll();
        } else {
            // 지정된 타입의 로그만 반환
            return activityLogRepository.findByType(type);
        }
    }
}