package com.example.backend.service;

import com.example.backend.entity.comment.Comment;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.dto.CommentResponse;
import com.example.backend.repository.*;
import com.example.backend.util.TimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;

    //댓글 작성
    public CommentResponse createComment(Long taskId, String content, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("작업을 찾을 수 없습니다."));
        Comment comment = Comment.builder()
                .content(content)
                .user(user)
                .task(task)
                .createdAt(LocalDateTime.now())
                .build();
        commentRepository.save(comment);
        activityLogService.logCommentCreation(user, task);
        notificationService.sendCommentNotification(user, task);
        return CommentResponse.builder()
                .id(comment.getId())
                .username(user.getName())
                .content(comment.getContent())
                .createdAt(TimeUtils.getTimeAgo(comment.getCreatedAt()))
                .build();
    }

    //댓글 조회
    public List<CommentResponse> getCommentsByTaskId(Long taskId, String email) {
        taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("작업을 찾을 수 없습니다."));
        List<Comment> comments = commentRepository.findByTaskId(taskId);
        return comments.stream()
                .map(comment -> CommentResponse.builder()
                        .id(comment.getId())
                        .username(comment.getUser().getName())
                        .content(comment.getContent())
                        .createdAt(TimeUtils.getTimeAgo(comment.getCreatedAt()))
                        .build())
                .collect(Collectors.toList());
    }

    //댓글 수정
    public CommentResponse updateComment(Long commentId, String content, String email) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        if (!comment.getUser().getEmail().equals(email)) {
            throw new AccessDeniedException("수정 권한이 없습니다.");
        }

        comment.setContent(content);
        commentRepository.save(comment);

        return CommentResponse.builder()
                .id(comment.getId())
                .username(comment.getUser().getName())
                .content(comment.getContent())
                .createdAt(TimeUtils.getTimeAgo(comment.getCreatedAt()))
                .build();
    }

    //댓글 삭제
    @Transactional
    public void deleteComment(Long commentId, String email) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        boolean isAuthor = comment.getUser().getEmail().equals(email);
        boolean isAdmin = comment.getTask().getProject().getMembers().stream()
                .anyMatch(m -> m.getUser().getEmail().equals(email) && m.getRole().name().equals("ADMIN"));

        if (!isAuthor && !isAdmin) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }

        commentRepository.delete(comment);
    }
}
