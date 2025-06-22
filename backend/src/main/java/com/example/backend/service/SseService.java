package com.example.backend.service;

import com.example.backend.dto.NotificationResponse;
import com.example.backend.entity.project.ProjectInvitationStatus;
import com.example.backend.entity.project.ProjectMember;
import com.example.backend.repository.ProjectMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {
    private final ProjectMemberRepository projectMemberRepository;

    public SseService(ProjectMemberRepository projectMemberRepository) {
        this.projectMemberRepository = projectMemberRepository;
    }

    private static final Logger logger = LoggerFactory.getLogger(SseService.class);
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        this.emitters.put(userId, emitter);

        emitter.onCompletion(() -> this.emitters.remove(userId));
        emitter.onTimeout(() -> this.emitters.remove(userId));
        emitter.onError(e -> this.emitters.remove(userId));

        sendToClient(userId, "connected", "SSE-Connection-Success");

        logger.info("SSE emitter 활성화 | 사용자 ID: {}", userId);
        return emitter;
    }

    public void sendNotification(Long userId, NotificationResponse notification) {
        sendToClient(userId, "new-notification", notification);
    }

    private void sendToClient(Long userId, String eventName, Object data) {
        SseEmitter emitter = this.emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
                logger.info("'{}' 이벤트 전송 성공 | 사용자 ID: {}", eventName, userId);
            } catch (IOException e) {
                this.emitters.remove(userId);
                logger.error("SSE emitter 전송 오류 | 사용자 ID: {}, 오류: {}", userId, e.getMessage());
            }
        }
    }
    public void broadcastToProjectMembers(Long projectId, String eventName, Object data) {
        List<ProjectMember> members = projectMemberRepository.findByProjectIdAndInvitationStatus(projectId, ProjectInvitationStatus.ACCEPTED);
        members.forEach(member -> sendToClient(member.getUser().getId(), eventName, data));
    }
}