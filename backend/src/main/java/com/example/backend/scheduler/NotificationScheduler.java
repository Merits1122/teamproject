package com.example.backend.scheduler;

import com.example.backend.entity.Status;
import com.example.backend.entity.comment.Comment;
import com.example.backend.entity.notification.NotificationSettings;
import com.example.backend.entity.notification.NotificationType;
import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import com.example.backend.repository.CommentRepository;
import com.example.backend.repository.NotificationSettingsRepository;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.TaskRepository;
import com.example.backend.service.EmailService;
import com.example.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;
    private final NotificationSettingsRepository settingsRepository;
    private final EmailService emailService;
    private final CommentRepository commentRepository;
    private final ProjectRepository projectRepository;

    @Value("${frontend.base-url}")
    private String frontendBaseUrl;

    @Scheduled(cron = "0 0 9 * * *")
    public void checkTaskDueDates() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysFromNow = today.plusDays(3);

        List<Task> upcomingTasks = taskRepository.findByDueDateBetweenAndStatusNot(today, threeDaysFromNow, Status.DONE);

        for (Task task : upcomingTasks) {
            if (task.getAssignee() != null) {

                long daysUntilDue = ChronoUnit.DAYS.between(today, task.getDueDate());
                String dayDescription;

                if (daysUntilDue == 0) {
                    dayDescription = "마감 기한이 오늘까지입니다.";
                } else if (daysUntilDue == 1) {
                    dayDescription = "마감 기한이 하루 남았습니다.";
                } else {
                    dayDescription = String.format("마감 기한이 %d일 남았습니다.", daysUntilDue);
                }
                String message = String.format("업무 '<strong>%s</strong>'의 %s", task.getTitle(), dayDescription);
                String link = String.format(frontendBaseUrl + "/dashboard/project/%d?taskId=%d", task.getProject().getId(), task.getId());

                notificationService.createAndSendNotification(
                        task.getAssignee(),
                        NotificationType.TASK_DUE_DATE,
                        message,
                        link,
                        task.getAssignee()
                );
            }
        }
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyDigests() {
        List<NotificationSettings> usersToNotify = settingsRepository.findByDailyDigestTrue();
        LocalDateTime since = LocalDateTime.now().minusHours(24);

        for (NotificationSettings setting : usersToNotify) {
            sendDigestEmailForUser(setting.getUser(), since, "일일");
        }
    }

    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyDigests() {
        List<NotificationSettings> usersToNotify = settingsRepository.findByWeeklyDigestTrue();
        LocalDateTime since = LocalDateTime.now().minusDays(7);

        for (NotificationSettings setting : usersToNotify) {
            sendDigestEmailForUser(setting.getUser(), since, "주간");
        }
    }

    private void sendDigestEmailForUser(User user, LocalDateTime since, String digestType) {
        List<Project> userProjects = projectRepository.findAcceptedProjectsByUserId(user.getId());
        StringBuilder emailBody = new StringBuilder(String.format("<h1>지난 %s 동안 활동 요약</h1>", "하루".equals(digestType) ? "하루" : "일주일"));

        boolean hasUpdates = false;

        for (Project project : userProjects) {
            List<Task> newTasks = taskRepository.findByProjectIdAndAssigneeAndStatusNotAndCreatedAtAfter(
                    project.getId(), user, Status.DONE, since);

            List<Task> completedTasks = taskRepository.findByProjectIdAndAssigneeAndStatusAndUpdatedAtAfter(
                    project.getId(), user, Status.DONE, since);

            List<Comment> newComments = commentRepository.findByTaskProjectIdAndTaskAssigneeAndUserNotAndCreatedAtAfter(
                    project.getId(), user, user, since);
            List<Task> tasksWithNewComments = newComments.stream().map(Comment::getTask).distinct().toList();

            if (!newTasks.isEmpty() || !completedTasks.isEmpty() || !tasksWithNewComments.isEmpty()) {
                hasUpdates = true;
                emailBody.append(String.format("<h2>- %s -</h2>", project.getName()));
                emailBody.append("<ul>");

                buildSection(emailBody, "새로 할당된 업무", newTasks);
                buildSection(emailBody, "완료된 업무", completedTasks);
                buildSection(emailBody, "새로운 댓글이 달린 업무", tasksWithNewComments);

                emailBody.append("</ul>");
            }
        }
        if (hasUpdates) {
            emailService.sendEmail(user.getEmail(), String.format("[TaskFlow] %s 요약", digestType), emailBody.toString());
        }
    }

    private void buildSection(StringBuilder builder, String title, List<Task> tasks) {
        if (!tasks.isEmpty()) {
            builder.append(String.format("<li><b>%s (%d건):</b> %s</li>",
                    title,
                    tasks.size(),
                    tasks.stream().map(task -> "'" + task.getTitle() + "'").collect(Collectors.joining(", "))
            ));
        }
    }
}