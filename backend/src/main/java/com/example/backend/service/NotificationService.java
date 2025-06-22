package com.example.backend.service;

import com.example.backend.dto.NotificationResponse;
import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.NotificationSettings;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.user.User;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.NotificationSettingsRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository settingsRepository;
    private final EmailService emailService;
    private final SseService sseService;

    @Transactional
    public void createAndSendNotification(User recipient, NotificationType type, String message, String link, User actor) {
        Notification notification = Notification.builder()
                .user(recipient)
                .type(type)
                .message(message)
                .link(link)
                .actor(actor)
                .isRead(false)
                .build();
        Notification savedNotification = notificationRepository.save(notification);

        sseService.sendNotification(recipient.getId(), new NotificationResponse(savedNotification));

        settingsRepository.findById(recipient.getId()).ifPresent(settings -> {
            if (shouldSendEmail(settings, type)) {
                String linkWithRecipient = String.format("%s&recipientId=%d", link, recipient.getId());
                String emailTitle = "[TaskFlow] 새 알림: " + type.getDisplayName();
                emailService.sendNotificationEmail(recipient.getEmail(), emailTitle, message, linkWithRecipient);
            }
        });
    }

    private boolean shouldSendEmail(NotificationSettings settings, NotificationType type) {
        if (!settings.isEmailNotifications()) {
            return false;
        }
        return switch (type) {
            case TASK_ASSIGNED -> settings.isTaskAssigned();
            case TASK_UPDATED -> settings.isTaskUpdated();
            case TASK_COMMENT -> settings.isTaskCommented();
            case TASK_DUE_DATE -> settings.isTaskDueDate();
            case PROJECT_INVITATION -> settings.isProjectInvitation();
            default -> false;
        };
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(User user) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return notifications.stream()
                .map(NotificationResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("알림을 찾을 수 없습니다."));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("이 알림을 읽을 권한이 없습니다.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        logger.info("알림 읽음 처리 완료: ID {}", notificationId);
    }

    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsReadForUser(user.getId());
        logger.info("사용자 {}의 모든 알림을 읽음 처리했습니다.", user.getEmail());
    }
}