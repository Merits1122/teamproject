package com.example.backend.service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String token, String resetUrlBase);
    void sendProjectInvitationEmail(String toEmail, String projectName, String inviterName, String invitationLink);
    void sendTwoFactorCodeEmail(String toEmail, String code);
    void sendVerificationEmail(String toEmail, String token, String verificationUrlBase);
    void sendNotificationEmail(String toEmail, String subject, String message, String link);
    void sendEmail(String toEmail, String subject, String htmlBody);
}