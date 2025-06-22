package com.example.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.io.UnsupportedEncodingException;

@Service("emailServiceImpl")
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Autowired
    public EmailServiceImpl(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    // 공통 HTML 이메일 발송 메소드
    public void sendEmail(String toEmail, String subject, String htmlBody) {
        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            String fromDisplayName = "TaskFlow";
            helper.setFrom(fromEmail, fromDisplayName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            javaMailSender.send(mimeMessage);
            logger.info("'{}'에게 이메일 전송 성공", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("'{}'에게 이메일 전송 실패", toEmail, e);
        }
    }

    //본인인증
    @Override
    @Async
    public void sendVerificationEmail(String toEmail, String token, String verificationUrlBase) {
        String verificationLink = verificationUrlBase + "?token=" + token;
        String subject = "[TaskFlow] 이메일 본인 인증";
        String htmlBody = String.format(
                "<div style='...'>" +
                        "<h2>TaskFlow 계정 활성화</h2>" +
                        "<a href=\"%s\"'>계정 활성화하기</a>" +
                        "</div>",
                verificationLink
        );
        sendEmail(toEmail, subject, htmlBody);
    }

    //비밀번호 초기화
    @Override
    @Async
    public void sendPasswordResetEmail(String toEmail, String token, String resetUrlBase) {
        String resetLink = resetUrlBase + "?token=" + token;
        String subject = "[TaskFlow] 비밀번호 재설정";
        String htmlBody = String.format(
                "<p>비밀번호 재설정</p>" +
                        "<p><a href=\"%s\">비밀번호 재설정 링크</a></p>",
                resetLink
        );
        sendEmail(toEmail, subject, htmlBody);
    }

    //프로젝트 초대
    @Override
    @Async
    public void sendProjectInvitationEmail(String toEmail, String projectName, String inviterName, String invitationLink) {
        String subject = String.format("[TaskFlow] 프로젝트에 초대", projectName);
        String htmlBody = String.format(
                "<p>프로젝트 초대</p>" +
                        "<p><a href=\"%s\">프로젝트 초대 수락</a></p>",
                invitationLink
        );
        sendEmail(toEmail, subject, htmlBody);
    }

    //2단계 인증
    @Override
    @Async
    public void sendTwoFactorCodeEmail(String toEmail, String code) {
        String subject = "[TaskFlow] 2단계 인증 코드";
        String htmlBody = String.format(
                "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>" +
                        "<h2>2단계 인증 코드</h2>" +
                        "<p>로그인을 완료하려면 아래 인증 코드를 입력해주세요.</p>" +
                        "<h3 style='padding: 10px; background-color: #f2f2f2; border-radius: 5px; text-align: center; letter-spacing: 2px;'>%s</h3>" +
                        "</div>",
                code
        );
        sendEmail(toEmail, subject, htmlBody);
    }

    //알람
    @Override
    public void sendNotificationEmail(String to, String subject, String message, String link) {
        String htmlBody = String.format(
                "<div style='font-family: sans-serif;'>" +
                        "<h2>TaskFlow 알림</h2>" +
                        "<div style='border-left: 3px solid #007bff; padding-left: 15px; margin: 15px 0;'>" +
                        "<p>%s</p>" +
                        "</div>" +
                        "<a href=\"%s\" style='display: inline-block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;'>자세히 보기</a>" +
                        "</div>",
                message, link
        );
        sendEmail(to, subject, htmlBody);
    }


}