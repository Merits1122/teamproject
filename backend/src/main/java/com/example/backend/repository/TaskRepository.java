package com.example.backend.repository;

import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Task> findByProjectAndAssignee(Project project, User assignee);
    @Query("""
    SELECT t FROM Task t
    WHERE t.dueDate = :targetDate
        """)
    List<Task> findTasksDueOn(@Param("targetDate") LocalDate targetDate);
}