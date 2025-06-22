package com.example.backend.controller;

import com.example.backend.dto.ChangePasswordRequest;
import com.example.backend.dto.NotificationSettingsResponse;
import com.example.backend.dto.UserProfileResponse;
import com.example.backend.dto.UserProfileRequest;
import com.example.backend.entity.user.User;
import com.example.backend.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user/profile")
public class UserProfileController {

    private static final Logger logger = LoggerFactory.getLogger(UserProfileController.class);
    private final UserService userService;

    public UserProfileController(UserService userService) {
        this.userService = userService;
    }

    //프로필 조회
    @GetMapping
    public ResponseEntity<?> getUserProfile(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로필을 조회하려면 로그인이 필요합니다.");
        }
        try {
            logger.info("프로필 조회 요청 | 사용자: {}", currentUser.getEmail());
            UserProfileResponse profile = userService.getUserProfile(currentUser);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            logger.error("프로필 조회 중 오류 발생 | 사용자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로필 조회 중 오류가 발생했습니다.");
        }
    }

    //프로필 수정
    @PutMapping
    public ResponseEntity<?> updateUserProfile(
            @Valid @RequestBody UserProfileRequest userProfileRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("프로필을 수정하려면 로그인이 필요합니다.");
        }
        try {
            logger.info("프로필 수정 시도 | 사용자: {}", currentUser.getEmail());
            UserProfileResponse updatedProfile = userService.updateUserProfile(userProfileRequest, currentUser);
            return ResponseEntity.ok(updatedProfile);
        } catch (Exception e) {
            logger.error("프로필 수정 중 오류 발생 | 사용자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("프로필 수정 중 오류가 발생했습니다.");
        }
    }

    //아바타 수정
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateUserAvatar(
            @RequestParam("avatarFile") MultipartFile avatarFile, // 프론트에서 "avatarFile" 이름으로 보내야 함
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("아바타를 업로드하려면 로그인이 필요합니다.");
        }
        if (avatarFile.isEmpty()) {
            return ResponseEntity.badRequest().body("업로드할 파일이 없습니다.");
        }
        try {
            logger.info("아바타 업로드 시도 | 사용자: {}", currentUser.getEmail());
            UserProfileResponse updatedProfile = userService.updateUserAvatar(avatarFile, currentUser);
            return ResponseEntity.ok(updatedProfile);
        } catch (IllegalArgumentException e) {
            logger.warn("아바타 업로드 실패 | 사용자: {}, 원인: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("아바타 업로드 중 서버 오류 발생 | 사용자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("아바타 업로드 중 오류가 발생했습니다.");
        }
    }

    //비밀번호 변경
    @PutMapping("/password")
    public ResponseEntity<String> changePassword(
            @Valid @RequestBody ChangePasswordRequest changePasswordRequest,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("비밀번호를 변경하려면 로그인이 필요합니다.");
        }
        try {
            userService.changePassword(changePasswordRequest, currentUser);
            return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
        } catch (IllegalArgumentException e) {
            logger.warn("비밀번호 변경 실패 (잘못된 요청) | 사용자: {}, 원인: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("비밀번호 변경 거부 (권한 없음) | 사용자: {}, 원인: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            logger.error("비밀번호 변경 중 서버 오류 발생 | 사용자: {}", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("비밀번호 변경 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<String> enable2FA(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        try {
            userService.setTwoFactorEnabled(currentUser, true);
            return ResponseEntity.ok("2단계 인증이 활성화되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("설정 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<String> disable2FA(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        try {
            userService.setTwoFactorEnabled(currentUser, false);
            return ResponseEntity.ok("2단계 인증이 비활성화되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("설정 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        logger.warn("유효성 검사 실패: {}", errorMessage);

        return ResponseEntity.badRequest().body(errorMessage);
    }

    @GetMapping("/notification-settings")
    public ResponseEntity<NotificationSettingsResponse> getNotificationSettings(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userService.getNotificationSettings(currentUser));
    }

    @PutMapping("/notification-settings")
    public ResponseEntity<NotificationSettingsResponse> updateNotificationSettings(
            @AuthenticationPrincipal User currentUser,
            @RequestBody NotificationSettingsResponse settingsDto) {
        return ResponseEntity.ok(userService.updateNotificationSettings(currentUser, settingsDto));
    }
}