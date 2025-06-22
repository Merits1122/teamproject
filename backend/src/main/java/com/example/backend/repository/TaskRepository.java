package com.example.backend.repository;

import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.Status;
import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Task> findByProjectAndAssignee(Project project, User assignee);
    List<Task> findByDueDateBetweenAndStatusNot(LocalDate start, LocalDate end, Status status);
    List<Task> findByProjectIdAndAssigneeAndStatusNotAndCreatedAtAfter(Long projectId, User assignee, Status status, LocalDateTime dateTime);
    List<Task> findByProjectIdAndAssigneeAndStatusAndUpdatedAtAfter(Long projectId, User assignee, Status status, LocalDateTime dateTime);
}