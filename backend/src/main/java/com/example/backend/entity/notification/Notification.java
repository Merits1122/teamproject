package com.example.backend.entity.notification;

import com.example.backend.entity.project.Project;
import com.example.backend.entity.task.Task;
import com.example.backend.entity.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@Builder
@Table(name = "notification")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String message;

    @ManyToOne
    private Task task;

    @ManyToOne
    private Project project;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    public void setRead(boolean read) {
        this.isRead = read;
    }

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationCategory category;
}