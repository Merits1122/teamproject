package com.example.backend.dto;

import com.example.backend.entity.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
public class ProjectRequest {
    @NotBlank(message = "프로젝트 이름은 필수")
    @Size(max = 100, message = "프로젝트 이름은 최대 100자")
    private String name;

    @Size(max = 1000, message = "프로젝트 설명은 최대 1000자")
    private String description;

    private LocalDate startDate;
    private LocalDate endDate;

    @NotNull(message = "프로젝트 상태는 필수")
    private Status status;
}