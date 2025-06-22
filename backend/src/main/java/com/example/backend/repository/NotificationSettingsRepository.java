package com.example.backend.repository;

import com.example.backend.entity.notification.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {
    List<NotificationSettings> findByDailyDigestTrue();
    List<NotificationSettings> findByWeeklyDigestTrue();
}