package com.example.backend.repository;

import com.example.backend.entity.comment.Comment;
import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTaskIdOrderByCreatedAtAsc(Long taskId);
    List<Comment> findByTaskProjectIdAndTaskAssigneeAndUserNotAndCreatedAtAfter(Long projectId, User assignee, User author, LocalDateTime dateTime);
}