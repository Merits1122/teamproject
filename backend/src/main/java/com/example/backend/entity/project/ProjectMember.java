package com.example.backend.entity.project;

import com.example.backend.entity.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_members",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"project_id", "user_id"}),
                @UniqueConstraint(columnNames = {"project_id", "invited_email"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectRole role;

    @Column(name = "invited_email", nullable = true)
    private String invitedEmail;

    @Column(name = "invitation_token", unique = true, nullable = true)
    private String invitationToken;

    @Column(name = "invitation_token_expiry", nullable = true)
    private LocalDateTime invitationTokenExpiry;

    @Enumerated(EnumType.STRING)
    @Column(name = "invitation_status", nullable = true)
    private ProjectInvitationStatus invitationStatus;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "joined_at", nullable = true)
    private LocalDateTime joinedAt;
}