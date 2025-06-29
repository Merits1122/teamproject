package com.example.backend.service;

import com.example.backend.dto.ProjectRequest;
import com.example.backend.dto.ProjectResponse;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.entity.Status;
import com.example.backend.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;
    private final ProjectMemberService projectMemberService;
    private final ActivityLogService activityLogService;
    private final SseService sseService;

    public ProjectResponse createProject(ProjectRequest request, User creator) {
        if (request.getStartDate() != null && request.getEndDate() != null &&
                request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("시작일은 마감일보다 늦을 수 없습니다.");
        }
        logger.info("프로젝트 생성 시도 | 이름: '{}', 생성자: {}", request.getName(), creator.getEmail());

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(Status.TODO)
                .creator(creator)
                .build();
        Project savedProject = projectRepository.save(project);

        projectMemberService.addProjectCreatorAsAdmin(savedProject, creator);
        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 프로젝트를 생성했습니다.", creator.getName(), savedProject.getName());
        activityLogService.createLog(savedProject, creator, message, ActivityLogType.PROJECT_CREATED);
        logger.info("프로젝트 생성 완료 | ID: {}, 이름: '{}'", savedProject.getId(), savedProject.getName());

        return new ProjectResponse(savedProject);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long projectId, User currentUser) {
        Project project = projectRepository.findProjectWithMembersAndProfilesById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserCanReadProject(project, currentUser);
        return new ProjectResponse(project);
    }


    public ProjectResponse updateProject(Long projectId, ProjectRequest projectRequest, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("수정할 프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserIsAdminOfProject(project, currentUser);

        project.setName(projectRequest.getName());
        project.setDescription(projectRequest.getDescription());
        project.setStartDate(projectRequest.getStartDate());
        project.setEndDate(projectRequest.getEndDate());
        if (projectRequest.getStatus() != null) {
            project.setStatus(projectRequest.getStatus());
        }
        Project updatedProject = projectRepository.save(project);
        String message = String.format("<strong>%s</strong>님이 프로젝트의 세부 정보를 수정했습니다.", currentUser.getName());
        activityLogService.createLog(updatedProject, currentUser, message, ActivityLogType.PROJECT_UPDATED);
        sseService.broadcastToProjectMembers(projectId, "project-updated", Map.of("projectId", projectId));
        logger.info("프로젝트 수정 성공 | ID: {}, 수정자: {}", projectId, currentUser.getEmail());
        return new ProjectResponse(updatedProject);
    }

    public void deleteProject(Long projectId, User currentUser) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("삭제할 프로젝트를 찾을 수 없습니다: ID " + projectId));

        projectMemberService.ensureUserIsAdminOfProject(project, currentUser);

        projectRepository.delete(project);
        logger.info("프로젝트 삭제 성공 | ID: {}, 삭제자: {}", projectId, currentUser.getEmail());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getMyProjects(User currentUser) {
        List<Project> projects = projectMemberService.getAcceptedProjectsForUser(currentUser);
        logger.info("사용자 {}의 참여 프로젝트 {}건 조회 성공", currentUser.getEmail(), projects.size());
        return projects.stream()
                .map(ProjectResponse::new)
                .collect(Collectors.toList());
    }

    public void updateProjectStatus(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("상태를 재계산할 프로젝트를 찾을 수 없습니다: ID " + projectId));

        List<Task> tasks = project.getTasks();
        long totalTasks = tasks.size();
        long doneTasks = tasks.stream().filter(t -> t.getStatus() == Status.DONE).count();
        boolean hasInProgress = tasks.stream().anyMatch(t -> t.getStatus() == Status.IN_PROGRESS);

        if (tasks.isEmpty()) {
            project.setStatus(Status.TODO);
            projectRepository.save(project);
            return;
        }

        if (doneTasks == totalTasks) {
            project.setStatus(Status.DONE);
        } else if (hasInProgress || doneTasks > 0) {
            project.setStatus(Status.IN_PROGRESS);
        } else {
            project.setStatus(Status.TODO);
        }

        projectRepository.save(project);
        logger.info("프로젝트 상태 재계산 및 업데이트 | ID: {}, 상태 : {}", projectId, project.getStatus());
    }
}