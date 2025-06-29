package com.example.backend.service;

import com.example.backend.dto.TaskRequest;
import com.example.backend.dto.TaskResponse;
import com.example.backend.entity.*;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.task.TaskPriority;
import com.example.backend.entity.user.User;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.hibernate.cache.spi.support.CacheUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final SseService sseService;

    @Value("${frontend.base-url}")
    private String frontendBaseUrl;

    private String createLinkToTask(Long projectId, Long taskId) {
        return String.format(frontendBaseUrl + "/dashboard/project/%d?taskId=%d", projectId, taskId);
    }

    // 특정 프로젝트에 업무 생성
    public TaskResponse createTask(Long projectId, TaskRequest taskRequest, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserCanModifyTasksInProject(project, currentUser);

        Task task = new Task();
        task.setProject(project);
        task.setTitle(taskRequest.getTitle());
        task.setDescription(taskRequest.getDescription());
        task.setDueDate(taskRequest.getDueDate());

        task.setStatus(taskRequest.getStatus() != null ? taskRequest.getStatus() : Status.TODO);
        task.setPriority(taskRequest.getPriority() != null ? taskRequest.getPriority() : TaskPriority.MEDIUM);

        User assignee = null;
        if (taskRequest.getAssigneeId() != null) {
            assignee = userRepository.findById(taskRequest.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("담당자로 지정할 사용자를 찾을 수 없습니다: " + taskRequest.getAssigneeId()));
            task.setAssignee(assignee);
        }

        Task savedTask = taskRepository.save(task);
        logger.info("업무 생성 성공 | ID: {}, 제목: '{}', 생성자: {}", savedTask.getId(), savedTask.getTitle(), currentUser.getEmail());

        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무를 생성했습니다.", currentUser.getName(), savedTask.getTitle());
        activityLogService.createLog(project, currentUser, message, ActivityLogType.TASK_CREATED);

        if (assignee != null && !assignee.getId().equals(currentUser.getId())) {
            message = String.format("<strong>%s</strong>님이 당신에게 새로운 업무 <strong>'%s'</strong>를 할당했습니다.", currentUser.getName(), savedTask.getTitle());
            String link = createLinkToTask(projectId, savedTask.getId());
            notificationService.createAndSendNotification(assignee, NotificationType.TASK_ASSIGNED, message, link, currentUser);
        }

        projectService.updateProjectStatus(projectId);
        sseService.broadcastToProjectMembers(projectId, "project-updated", Map.of("projectId", projectId));
        return new TaskResponse(savedTask);
    }

    // 특정 프로젝트의 모든 업무 조회
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProjectId(Long projectId, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserCanReadProject(project, currentUser);

        return taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(TaskResponse::new)
                .collect(Collectors.toList());
    }

    // 특정 업무 상세 조회
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("업무를 찾을 수 없습니다: ID " + taskId));

        projectMemberService.ensureUserCanReadProject(task.getProject(), currentUser);

        return new TaskResponse(task);
    }

    // 업무 수정
    public TaskResponse updateTask(Long taskId, TaskRequest taskRequest, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("수정할 업무를 찾을 수 없습니다: ID " + taskId));
        User oldAssignee = task.getAssignee();
        projectMemberService.ensureUserCanModifyTasksInProject(task.getProject(), currentUser);

        task.setTitle(taskRequest.getTitle());
        task.setDescription(taskRequest.getDescription());
        task.setDueDate(taskRequest.getDueDate());
        task.setStatus(taskRequest.getStatus());
        task.setPriority(taskRequest.getPriority());

        User newAssignee = null;
        if (taskRequest.getAssigneeId() == null || taskRequest.getAssigneeId() == 0L) {
            task.setAssignee(null);
        } else {
            newAssignee = userRepository.findById(taskRequest.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("담당자로 지정할 사용자를 찾을 수 없습니다: ID " + taskRequest.getAssigneeId()));
            task.setAssignee(newAssignee);
        }

        Task updatedTask = taskRepository.save(task);
        projectService.updateProjectStatus(updatedTask.getProject().getId());

        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무의 세부사항을 수정했습니다.", currentUser.getName(), updatedTask.getTitle());
        activityLogService.createLog(task.getProject(), currentUser, message, ActivityLogType.TASK_UPDATED);

        boolean wasReassigned = (oldAssignee == null && newAssignee != null) ||
                (oldAssignee != null && newAssignee == null) ||
                (oldAssignee != null && !oldAssignee.getId().equals(newAssignee.getId()));

        if (wasReassigned && newAssignee != null) {
            if (!newAssignee.getId().equals(currentUser.getId())) {
                message = String.format("<strong>%s</strong>님이 당신에게 업무 <strong>'%s'</strong>를 할당했습니다.", currentUser.getName(), updatedTask.getTitle());
                String link = createLinkToTask(updatedTask.getProject().getId(), updatedTask.getId());
                notificationService.createAndSendNotification(newAssignee, NotificationType.TASK_ASSIGNED, message, link, currentUser);
            }
        } else if (oldAssignee != null) {
            if (!oldAssignee.getId().equals(currentUser.getId())) {
                message = String.format("<strong>%s</strong>님이 당신의 업무 <strong>'%s'</strong>를 수정했습니다.", currentUser.getName(), updatedTask.getTitle());
                String link = createLinkToTask(updatedTask.getProject().getId(), updatedTask.getId());
                notificationService.createAndSendNotification(oldAssignee, NotificationType.TASK_UPDATED, message, link, currentUser);
            }
        }
        sseService.broadcastToProjectMembers(updatedTask.getProject().getId(), "project-updated", Map.of("projectId", updatedTask.getProject().getId()));
        logger.info("업무 수정 성공 | ID: {}, 수정자: {}", updatedTask.getId(), currentUser.getEmail());
        return new TaskResponse(updatedTask);
    }

    public void updateTaskStatus(Long taskId, Status newStatus, User currentUser) {
        logger.info("업무 상태 변경 시도 | 업무 ID: {}, 새 상태: {}, 요청자: {}", taskId, newStatus, currentUser.getEmail());

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("업무를 찾을 수 없습니다: ID " + taskId));

        projectMemberService.ensureUserCanModifyTasksInProject(task.getProject(), currentUser);

        Status oldStatus = task.getStatus();

        if (oldStatus == newStatus) {
            logger.info("상태가 동일하여 변경하지 않습니다.");
            return;
        }

        task.setStatus(newStatus);
        taskRepository.save(task);
        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무의 상태를 <span class=\"text-blue-500\">%s</span>에서 <span class=\"text-green-500\">%s</span>(으)로 변경했습니다.",
                currentUser.getName(), task.getTitle(), oldStatus, newStatus);
        activityLogService.createLog(task.getProject(), currentUser, message, ActivityLogType.TASK_STATUS_CHANGED);
        logger.info("업무 상태 변경 완료 | 업무 ID: {}, '{}' -> '{}'", taskId, oldStatus, newStatus);

        sseService.broadcastToProjectMembers(task.getProject().getId(), "project-updated", Map.of("projectId", task.getProject().getId()));
        projectService.updateProjectStatus(task.getProject().getId());
    }
    // 업무 삭제
    public void deleteTask(Long taskId, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("삭제할 업무를 찾을 수 없습니다: ID " + taskId));

        Long projectId = task.getProject().getId();

        projectMemberService.ensureUserCanModifyTasksInProject(task.getProject(), currentUser);

        taskRepository.delete(task);
        taskRepository.flush();

        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무를 삭제했습니다.", currentUser.getName(), task.getTitle());
        activityLogService.createLog(task.getProject(), currentUser, message, ActivityLogType.TASK_DELETED);

        logger.info("업무 삭제 성공 | ID: {}, 삭제자: {}", taskId, currentUser.getEmail());
        sseService.broadcastToProjectMembers(projectId, "project-updated", Map.of("projectId", projectId));
        projectService.updateProjectStatus(projectId);
    }
}