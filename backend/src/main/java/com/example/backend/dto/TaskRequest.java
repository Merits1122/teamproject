package com.example.backend.dto;

import com.example.backend.entity.TaskPriority;
import com.example.backend.entity.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
public class TaskRequest {
    @NotBlank(message = "업무 제목은 필수")
    @Size(max = 255, message = "업무 제목은 최대 255자")
    private String title;

    @Size(max = 1000, message = "업무 설명은 최대 1000자")
    private String description;

    private LocalDate dueDate;

    @NotNull(message = "업무 상태는 필수")
    private Status status;

    @NotNull(message = "업무 우선순위는 필수")
    private TaskPriority priority;

    private Long assigneeId;
}