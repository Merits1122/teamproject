package com.example.backend.repository;

import com.example.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface  UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT u FROM User u JOIN FETCH u.userSecurity WHERE u.email = :email")
    Optional<User> findByEmailWithSecurity(@Param("email") String email);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationToken(String token);
}
