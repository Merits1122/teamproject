package com.example.backend.service;

import com.example.backend.dto.CommentRequest;
import com.example.backend.entity.activitylog.ActivityLogType;
import com.example.backend.entity.comment.Comment;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.project.ProjectRole;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.repository.CommentRepository;
import com.example.backend.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberService projectMemberService;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final SseService sseService;

    @Value("${frontend.base-url}")
    private String frontendBaseUrl;

    // 특정 업무의 댓글 목록 조회
    @Transactional(readOnly = true)
    public List<Comment> getCommentsForTask(Long taskId, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("업무를 찾을 수 없습니다."));
        projectMemberService.ensureUserIsMemberOfProject(task.getProject(), currentUser);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }

    // 댓글 추가
    public Comment addComment(Long taskId, CommentRequest request, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("업무를 찾을 수 없습니다."));
        projectMemberService.ensureUserIsMemberOfProject(task.getProject(), currentUser);

        Comment comment = new Comment(request.getContent(), currentUser, task);
        String message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무에 댓글을 작성했습니다.", currentUser.getName(), task.getTitle());
        activityLogService.createLog(task.getProject(), currentUser, message, ActivityLogType.COMMENT_CREATED);

        if (task.getAssignee() != null && !task.getAssignee().getId().equals(currentUser.getId())) {
            message = String.format("<strong>%s</strong>님이 <strong>'%s'</strong> 업무에 새로운 댓글을 남겼습니다.", currentUser.getName(), task.getTitle());
            String link = String.format(frontendBaseUrl + "/dashboard/project/%d?taskId=%d", task.getProject().getId(), task.getId());
            notificationService.createAndSendNotification(task.getAssignee(), NotificationType.TASK_COMMENT, message, link, currentUser);
        }
        sseService.broadcastToProjectMembers(task.getProject().getId(), "project-updated", Map.of("projectId", task.getProject().getId()));
        return commentRepository.save(comment);
    }

    //댓글 수정
    public Comment updateComment(Long commentId, CommentRequest request, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("댓글을 찾을 수 없습니다."));

        if (!Objects.equals(comment.getUser().getId(), currentUser.getId())) {
            throw new AccessDeniedException("이 댓글을 수정할 권한이 없습니다.");
        }

        comment.setContent(request.getContent());
        return commentRepository.save(comment);
    }

    // 댓글 삭제
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("댓글을 찾을 수 없습니다."));

        boolean isAuthor = Objects.equals(comment.getUser().getId(), currentUser.getId());
        ProjectRole userRole = projectMemberService.getUserRoleInProject(comment.getTask().getProject(), currentUser);
        boolean isAdmin = userRole == ProjectRole.ADMIN;

        if (!isAuthor && !isAdmin) {
            throw new AccessDeniedException("이 댓글을 삭제할 권한이 없습니다.");
        }

        commentRepository.delete(comment);
    }
}