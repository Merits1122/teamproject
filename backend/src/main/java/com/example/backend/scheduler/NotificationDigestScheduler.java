package com.example.backend.scheduler;

import com.example.backend.entity.notification.Notification;
import com.example.backend.entity.notification.UserNotificationSetting;
import com.example.backend.entity.user.User;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.UserNotificationSettingRepository;
import com.example.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDigestScheduler {

    private final UserNotificationSettingRepository settingRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    // 매주 월요일 오전 9시에 실행 (cron = 초 분 시 일 월 요일)
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyDigestEmails() {
        List<UserNotificationSetting> settings = settingRepository.findAllByWeeklyDigestEnabledTrue();

        for (UserNotificationSetting setting : settings) {
            User user = setting.getUser();
            LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
            List<Notification> recentNotifications =
                    notificationRepository.findByRecipientAndTimestampAfter(user, oneWeekAgo);

            if (recentNotifications.isEmpty()) continue;

            StringBuilder summary = new StringBuilder();
            summary.append("[알림 요약]\n\n");
            for (Notification n : recentNotifications) {
                summary.append("- [").append(n.getCategory()).append("] ")
                        .append(n.getMessage()).append("\n");
            }

            try {
                emailService.sendProjectInvitationEmail(
                        user.getEmail(), "주간 알림 요약", "Team System", summary.toString()
                );
            } catch (Exception e) {
                log.warn("{} 사용자 알림 요약 전송 실패: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyDigestEmails() {
        List<UserNotificationSetting> settings = settingRepository.findAllByDailyDigestEnabledTrue();

        for (UserNotificationSetting setting : settings) {
            User user = setting.getUser();
            LocalDateTime since = LocalDateTime.now().minusDays(1);
            List<Notification> recentNotifications =
                    notificationRepository.findByRecipientAndTimestampAfter(user, since);

            if (recentNotifications.isEmpty()) continue;

            StringBuilder summary = new StringBuilder();
            summary.append("[알림 요약]\n\n");
            for (Notification n : recentNotifications) {
                summary.append("- [").append(n.getCategory()).append("] ")
                        .append(n.getMessage()).append("\n");
            }

            try {
                emailService.sendProjectInvitationEmail(
                        user.getEmail(), "일간 알림 요약", "Team System", summary.toString()
                );
            } catch (Exception e) {
                log.warn("{} 사용자 알림 요약 전송 실패: {}", user.getEmail(), e.getMessage());
            }
        }
    }
}
