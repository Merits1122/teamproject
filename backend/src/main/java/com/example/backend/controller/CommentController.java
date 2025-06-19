package com.example.backend.controller;

import com.example.backend.dto.CommentRequest;
import com.example.backend.dto.CommentResponse;
import com.example.backend.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard/project/{projectId}/tasks/{taskId}/comment")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 댓글 작성
    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestBody CommentRequest requestDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        CommentResponse responseDTO = commentService.createComment(taskId, requestDTO.getContent(), email);
        return ResponseEntity.ok(responseDTO);
    }

    // 댓글 목록 조회
    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        List<CommentResponse> comments = commentService.getCommentsByTaskId(taskId, email);
        return ResponseEntity.ok(comments);
    }

    // 댓글 수정
    @PutMapping("/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @RequestBody CommentRequest requestDTO,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        System.out.println("받은 댓글 내용 = " + requestDTO.getContent());
        CommentResponse responseDTO = commentService.updateComment(commentId, requestDTO.getContent(), email);
        return ResponseEntity.ok(responseDTO);
    }

    // 댓글 삭제
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        commentService.deleteComment(commentId, email);
        return ResponseEntity.noContent().build();
    }
}
