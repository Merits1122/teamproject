package com.example.backend.controller;

import com.example.backend.entity.notification.UserNotificationSetting;
import com.example.backend.entity.user.User;
import com.example.backend.dto.NotificationSettingRequest;
import com.example.backend.repository.UserNotificationSettingRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications/settings")
@RequiredArgsConstructor
public class NotificationSettingController {

    private final UserRepository userRepository;
    private final UserNotificationSettingRepository settingRepository;

    @PostMapping
    public ResponseEntity<?> updateNotificationSettings(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NotificationSettingRequest dto) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        UserNotificationSetting setting = settingRepository.findByUser(user)
                .orElse(UserNotificationSetting.builder().user(user).build());

        setting.setCommentAlertEnabled(dto.isCommentAlertEnabled());
        setting.setTaskAssignAlertEnabled(dto.isTaskAssignAlertEnabled());
        setting.setProjectInviteAlertEnabled(dto.isProjectInviteAlertEnabled());
        setting.setWeeklyDigestEnabled(dto.isWeeklyDigestEnabled());
        setting.setDailyDigestEnabled(dto.isDailyDigestEnabled());

        settingRepository.save(setting);
        return ResponseEntity.ok("알림 설정이 저장되었습니다.");
    }

    @GetMapping
    public ResponseEntity<?> getNotificationSettings(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));

        UserNotificationSetting setting = settingRepository.findByUser(user)
                .orElse(UserNotificationSetting.builder().user(user).build());

        return ResponseEntity.ok(setting);
    }
}
