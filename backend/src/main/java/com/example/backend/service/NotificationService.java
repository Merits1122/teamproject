package com.example.backend.service;

import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.NotificationCategory;
import com.example.backend.entity.notification.UserNotificationSetting;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.dto.NotificationResponse;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.UserNotificationSettingRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserNotificationSettingRepository settingRepository;
    private final TaskRepository taskRepository;
    private final SseService sseService;

    //알림 클릭 시 작동 로직
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    //알림 조회
    public List<NotificationResponse> getNotificationsForUser(String email, NotificationCategory category, boolean unreadOnly) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        List<Notification> notifications;

        if (category != null && unreadOnly) {
            notifications = notificationRepository.findByRecipientAndCategoryAndIsReadFalse(user, category);
        } else if (category != null) {
            notifications = notificationRepository.findByRecipientAndCategory(user, category);
        } else if (unreadOnly) {
            notifications = notificationRepository.findByRecipientAndIsReadFalse(user);
        } else {
            notifications = notificationRepository.findByRecipient(user);
        }

        return notifications.stream()
                .map(NotificationResponse::from)
                .toList();
    }

    //댓글 작성 알림
    public void sendCommentNotification(User recipient, Task task) {
        UserNotificationSetting setting = settingRepository.findByUser(recipient).orElse(null);
        if (setting != null && !setting.isAssignmentAlertEnabled()) return;
        String message = String.format("[프로젝트: %s] 업무 '%s'에 댓글이 달렸습니다.",
                task.getProject().getName(), task.getTitle());

        Notification notification = Notification.builder()
                .recipient(recipient)
                .task(task)
                .message(message)
                .content(message)
                .category(NotificationCategory.COMMENT)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        sseService.sendNotification(recipient.getId(), notification.getMessage());
        System.out.println("[알림] " + recipient.getName() + " → " + message);
    }

    //업무 할당 알림
    public void sendAssignmentNotification(User recipient, Task task) {
        UserNotificationSetting setting = settingRepository.findByUser(recipient).orElse(null);
        if (setting != null && !setting.isAssignmentAlertEnabled()) return;

        String projectName = task.getProject() != null ? task.getProject().getName() : "알 수 없는 프로젝트";
        String taskTitle = task.getTitle() != null ? task.getTitle() : "알 수 없는 업무";

        String message = String.format("[프로젝트: %s] 업무 '%s'가 할당되었습니다.", projectName, taskTitle);

        Notification notification = Notification.builder()
                .recipient(recipient)
                .task(task)
                .message(message)
                .content(message)
                .category(NotificationCategory.ASSIGNMENT)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        sseService.sendNotification(recipient.getId(), notification.getMessage());
        System.out.println("[알림] " + recipient.getName() + " 님에게 업무 할당 알림 전송: " + message);
    }

    //업무 완료 알림
    public void sendCompletionNotification(User recipient, Task task) {
        UserNotificationSetting setting = settingRepository.findByUser(recipient).orElse(null);
        if (setting != null && !setting.isCompletionAlertEnabled()) return;

        String projectName = task.getProject() != null ? task.getProject().getName() : "알 수 없는 프로젝트";
        String taskTitle = task.getTitle() != null ? task.getTitle() : "알 수 없는 업무";

        String message = String.format("[프로젝트: %s] 업무 '%s'가 완료되었습니다.", projectName, taskTitle);

        Notification notification = Notification.builder()
                .recipient(recipient)
                .task(task)
                .message(message)
                .content(message)
                .category(NotificationCategory.COMPLETE)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        sseService.sendNotification(recipient.getId(), notification.getMessage());
        System.out.println("[알림] " + recipient.getName() + " 님에게 완료 알림 전송: " + message);
    }

    //초대 받은 사람에게 프로젝트 초대 알림
    public void sendProjectInvitationNotification(User recipient, Project project, User inviter) {
        UserNotificationSetting setting = settingRepository.findByUser(recipient).orElse(null);
        if (setting != null && !setting.isProjectJoinAlertEnabled()) return;

        String message = inviter.getName() + " 님이 [" + project.getName() + "] 프로젝트에 당신을 초대했습니다.";

        Notification notification = Notification.builder()
                .recipient(recipient)
                .project(project)
                .message(message)
                .content(message)
                .category(NotificationCategory.INVITE)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        sseService.sendNotification(recipient.getId(), notification.getMessage());
        System.out.println("[알림] 초대 알림 발송 → " + recipient.getName());
    }

    //모두 읽음 처리 프론트와 연결 필요
    @Transactional
    public void markAllAsRead(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자 없음"));
        List<Notification> notifications = notificationRepository.findByRecipient(user);

        for (Notification n : notifications) {
            n.setRead(true);
        }
        notificationRepository.saveAll(notifications);
    }

    @Scheduled(cron = "0 0 9 * * *") // 매일 오전 9시
    public void notifyTasksDueSoon(User recipient) {
        UserNotificationSetting setting = settingRepository.findByUser(recipient).orElse(null);
        if (setting != null && !setting.isProjectJoinAlertEnabled()) return;
        LocalDate targetDate = LocalDate.now().plusDays(3);
        List<Task> dueTasks = taskRepository.findTasksDueOn(targetDate);

        for (Task task : dueTasks) {
            User assignee = task.getAssignee();
            if (assignee != null) {
                Notification notification = Notification.builder()
                        .recipient(assignee)
                        .message("마감일이 3일 남은 업무: " + task.getTitle())
                        .category(NotificationCategory.DEADLINE)
                        .timestamp(LocalDateTime.now())
                        .isRead(false)
                        .task(task)
                        .project(task.getProject())
                        .build();
                notificationRepository.save(notification);
            }
        }
    }
}