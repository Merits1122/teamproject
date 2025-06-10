package com.example.backend.dto;

import com.example.backend.entity.project.ProjectRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeRoleRequest {
    @NotNull(message = "새로운 역할은 필수")
    private ProjectRole role;
}