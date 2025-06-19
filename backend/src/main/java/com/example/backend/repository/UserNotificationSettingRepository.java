package com.example.backend.repository;

import com.example.backend.entity.notification.UserNotificationSetting;
import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserNotificationSettingRepository extends JpaRepository<UserNotificationSetting, Long> {
    Optional<UserNotificationSetting> findByUser(User user);
    List<UserNotificationSetting> findAllByWeeklyDigestEnabledTrue();
    List<UserNotificationSetting> findAllByDailyDigestEnabledTrue();
}
