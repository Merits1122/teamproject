package com.example.backend.service;

import com.example.backend.dto.TaskRequest;
import com.example.backend.dto.TaskResponse;
import com.example.backend.entity.*;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.task.TaskPriority;
import com.example.backend.entity.user.User;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
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

        if (taskRequest.getAssigneeId() != null) {
            User assignee = userRepository.findById(taskRequest.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("담당자로 지정할 사용자를 찾을 수 없습니다: " + taskRequest.getAssigneeId()));
            task.setAssignee(assignee);
        }

        Task savedTask = taskRepository.save(task);
        logger.info("업무 생성 성공 | ID: {}, 제목: '{}', 생성자: {}", savedTask.getId(), savedTask.getTitle(), currentUser.getEmail());

        projectService.updateProjectStatus(projectId);
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

        projectMemberService.ensureUserCanModifyTasksInProject(task.getProject(), currentUser);

        task.setTitle(taskRequest.getTitle());
        task.setDescription(taskRequest.getDescription());
        task.setDueDate(taskRequest.getDueDate());
        task.setStatus(taskRequest.getStatus());
        task.setPriority(taskRequest.getPriority());


        if (taskRequest.getAssigneeId() == null || taskRequest.getAssigneeId() == 0L) {
            task.setAssignee(null);
        } else {
            User assignee = userRepository.findById(taskRequest.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("담당자로 지정할 사용자를 찾을 수 없습니다: ID " + taskRequest.getAssigneeId()));
            task.setAssignee(assignee);
        }

        Task updatedTask = taskRepository.save(task);
        projectService.updateProjectStatus(updatedTask.getProject().getId());

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

        logger.info("업무 상태 변경 완료 | 업무 ID: {}, '{}' -> '{}'", taskId, oldStatus, newStatus);

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

        logger.info("업무 삭제 성공 | ID: {}, 삭제자: {}", taskId, currentUser.getEmail());

        projectService.updateProjectStatus(projectId);
    }
}