package com.example.backend.dto;

import com.example.backend.entity.Status;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskStatusUpdateRequest {
    @NotNull(message = "업무 상태는 필수")
    private Status status;
}