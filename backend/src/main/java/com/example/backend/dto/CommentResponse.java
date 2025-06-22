package com.example.backend.dto;

import com.example.backend.entity.user.User;
import com.example.backend.entity.comment.Comment;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private UserInfo user;

    @Getter
    private static class UserInfo {
        private Long id;
        private String name;
        private String avatarUrl;

        public UserInfo(User user) {
            this.id = user.getId();
            this.name = user.getName();
            if (user.getUserProfile() != null) {
                this.avatarUrl = user.getUserProfile().getAvatarUrl();
            }
        }
    }

    public CommentResponse(Comment comment) {
        this.id = comment.getId();
        this.content = comment.getContent();
        this.createdAt = comment.getCreatedAt();
        this.user = new UserInfo(comment.getUser());
    }
}
