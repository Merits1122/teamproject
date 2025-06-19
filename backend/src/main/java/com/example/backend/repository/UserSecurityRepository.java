package com.example.backend.repository;

import com.example.backend.entity.user.UserSecurity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserSecurityRepository extends JpaRepository<UserSecurity, Long> {
    Optional<UserSecurity> findByPasswordResetToken(String token);
}