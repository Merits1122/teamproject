package com.example.backend.repository;

import com.example.backend.entity.activitylog.ActivityLog;
import com.example.backend.entity.project.Project;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProjectOrderByCreatedAtDesc(Project project);
    @Query("SELECT al FROM ActivityLog al WHERE al.project.id IN " +
            "(SELECT pm.project.id FROM ProjectMember pm WHERE pm.user.id = :userId AND pm.invitationStatus = 'ACCEPTED') " +
            "ORDER BY al.createdAt DESC")
    List<ActivityLog> findRecentActivitiesByUserId(Long userId, Pageable pageable);
}