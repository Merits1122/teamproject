package com.example.backend.repository;

import com.example.backend.entity.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Query("SELECT p FROM Project p " +
            "LEFT JOIN FETCH p.members m " +
            "LEFT JOIN FETCH m.user u " +
            "LEFT JOIN FETCH u.userProfile " +
            "WHERE p.id = :projectId")
    Optional<Project> findProjectWithMembersAndProfilesById(@Param("projectId") Long projectId);
}