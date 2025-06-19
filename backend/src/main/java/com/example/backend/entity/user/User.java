package com.example.backend.entity.user;

import com.example.backend.entity.project.ProjectMember;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(unique = true, nullable = true)
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private UserProfile userProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private UserSecurity userSecurity;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProjectMember> projectMemberships = new ArrayList<>();

    public enum AuthProvider {
        LOCAL, GOOGLE
    }

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "email_verification_token", unique = true)
    private String emailVerificationToken;

    public void setUserProfile(UserProfile userProfile) {
        this.userProfile = userProfile;
        userProfile.setUser(this);
    }
    public void setUserSecurity(UserSecurity userSecurity) {
        this.userSecurity = userSecurity;
        userSecurity.setUser(this);
    }
}