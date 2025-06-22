package com.example.backend.dto;

import com.example.backend.entity.project.ProjectMember;
import lombok.Getter;

@Getter
public class InvitationDetailsResponse {
    private String inviterName;
    private String projectName;
    private String invitedEmail;

    public InvitationDetailsResponse(ProjectMember invitation) {
        this.inviterName = invitation.getProject().getCreator().getName();
        this.projectName = invitation.getProject().getName();
        this.invitedEmail = invitation.getInvitedEmail();
    }
}