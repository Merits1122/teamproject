package com.example.backend.dto;

import com.example.backend.entity.project.ProjectRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponse {
    private Long id;
    private String name;
    private String email;
    private ProjectRole role;
    private String avatarUrl;
}