package com.example.backend.entity.notification;

import com.example.backend.entity.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserNotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    private boolean commentAlertEnabled = true;

    @Builder.Default
    private boolean taskAssignAlertEnabled = true;

    @Builder.Default
    private boolean projectInviteAlertEnabled = true;

    @Builder.Default
    private boolean weeklyDigestEnabled = false;

    @Builder.Default
    private boolean dailyDigestEnabled = false;

    private boolean assignmentAlertEnabled = true;
    private boolean completionAlertEnabled = true;
    private boolean projectJoinAlertEnabled = true;

    public boolean isAssignmentAlertEnabled() {
        return assignmentAlertEnabled;
    }

    public boolean isCompletionAlertEnabled() {
        return completionAlertEnabled;
    }

    public boolean isProjectJoinAlertEnabled() {
        return projectJoinAlertEnabled;
    }

}
