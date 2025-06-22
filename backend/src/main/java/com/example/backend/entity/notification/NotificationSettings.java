package com.example.backend.entity.notification;

import com.example.backend.entity.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notification_settings")
@Getter
@Setter
@NoArgsConstructor
public class NotificationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private boolean emailNotifications = true;

    @Column(nullable = false)
    private boolean taskAssigned = true;

    @Column(nullable = false)
    private boolean taskUpdated = true;

    @Column(nullable = false)
    private boolean taskCommented = true;

    @Column(nullable = false)
    private boolean taskDueDate = true;

    @Column(nullable = false)
    private boolean projectInvitation = true;

    @Column(nullable = false)
    private boolean dailyDigest = true;

    @Column(nullable = false)
    private boolean weeklyDigest = true;

    public NotificationSettings(User user) {
        this.user = user;
    }
}