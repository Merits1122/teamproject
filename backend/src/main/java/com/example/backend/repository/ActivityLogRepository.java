package com.example.backend.repository;

import com.example.backend.entity.activity.ActivityLog;
import com.example.backend.entity.activity.ActivityType;
import com.example.backend.entity.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    @Query("""
    SELECT l FROM ActivityLog l
    WHERE l.project = :project
    ORDER BY l.timestamp DESC
""")
    List<ActivityLog> findByProject(@Param("project") Project project);
    List<ActivityLog> findByType(ActivityType type);
}