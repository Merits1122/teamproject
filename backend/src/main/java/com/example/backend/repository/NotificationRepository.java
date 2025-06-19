package com.example.backend.repository;

import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.NotificationCategory;
import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient(User user);
    List<Notification> findByRecipientAndCategory(User user, NotificationCategory category);
    List<Notification> findByRecipientAndTimestampAfter(User user, LocalDateTime since);
    List<Notification> findByRecipientAndIsReadFalse(User user);
    List<Notification> findByRecipientAndCategoryAndIsReadFalse(User user, NotificationCategory category);
}