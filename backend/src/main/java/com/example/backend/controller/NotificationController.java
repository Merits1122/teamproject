package com.example.backend.controller;

import com.example.backend.entity.notification.NotificationCategory;
import com.example.backend.dto.NotificationResponse;
import com.example.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    // 알림 필터링 조회
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) NotificationCategory category,
            @RequestParam(defaultValue = "false") boolean unreadOnly
    ) {
        List<NotificationResponse> notifications = notificationService.getNotificationsForUser(
                userDetails.getUsername(),
                category,
                unreadOnly
        );
        return ResponseEntity.ok(notifications);
    }

    // 알림 읽음 처리
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    // 모두 읽음 버튼 클릭시 작동
    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}