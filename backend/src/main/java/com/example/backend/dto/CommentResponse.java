package com.example.backend.dto;

import com.example.backend.entity.comment.Comment;
import com.example.backend.util.TimeUtils;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentResponse {
    private Long id;
    private String content;
    private String username;
    private String createdAt;

    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .username(comment.getUser().getName())
                .createdAt(TimeUtils.getTimeAgo(comment.getCreatedAt()))
                .build();
    }
}