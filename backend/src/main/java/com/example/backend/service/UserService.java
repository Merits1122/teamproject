package com.example.backend.service;

import com.example.backend.dto.ChangePasswordRequest;
import com.example.backend.dto.SignupRequest;
import com.example.backend.dto.UserProfileRequest;
import com.example.backend.dto.UserProfileResponse;
import com.example.backend.entity.User;
import com.example.backend.entity.UserProfile;
import com.example.backend.entity.UserSecurity;
import com.example.backend.repository.UserProfileRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.UserSecurityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
public class UserService implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final StorageService storageService;
    private final UserSecurityRepository userSecurityRepository;
    private final UserProfileRepository userProfileRepository;

    @Value("${frontend.reset-password.url}")
    private String resetPasswordUrlBase;

    @Value("${frontend.verify-email.url}")
    private String verifyEmailUrlBase;

    @Value("${file.avatar-url-path}")
    private String avatarUrlPath;

    @Value("${server.base-url}")
    private String serverBaseUrl;

    @Autowired
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       @Qualifier("emailServiceImpl") EmailService emailService,
                       StorageService storageService,
                       UserSecurityRepository userSecurityRepository,
                       UserProfileRepository userProfileRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.storageService = storageService;
        this.userSecurityRepository = userSecurityRepository;
        this.userProfileRepository = userProfileRepository;
    }


    //회원가입
    @Transactional
    public void signup(SignupRequest signupRequest) {
        if (userRepository.findByEmail(signupRequest.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .name(signupRequest.getName())
                .email(signupRequest.getEmail())
                .provider(User.AuthProvider.LOCAL)
                .emailVerified(false)
                .emailVerificationToken(verificationToken)
                .build();

        UserProfile userProfile = new UserProfile();
        UserSecurity userSecurity = new UserSecurity();
        userSecurity.setPassword(passwordEncoder.encode(signupRequest.getPassword()));

        user.setUserProfile(userProfile);
        user.setUserSecurity(userSecurity);

        userRepository.save(user);
        logger.info("신규 사용자 등록 완료. 이메일 인증 대기 중 | 이메일: {}", user.getEmail());

        emailService.sendVerificationEmail(user.getEmail(), verificationToken, verifyEmailUrlBase);
    }

    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 인증 토큰입니다."));

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);
        logger.info("이메일 인증 성공 | 사용자: {}", user.getEmail());
    }

    //비밀번호 재설정
    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("해당 이메일의 사용자를 찾을 수 없습니다: " + email));

        if (user != null) {
            if (user.getProvider() != User.AuthProvider.LOCAL) {
                System.out.println("소셜 로그인 사용자는 이메일을 통한 비밀번호 재설정을 사용할 수 없습니다: " + email);
                throw new IllegalStateException("소셜 로그인 사용자는 이 기능을 사용할 수 없습니다.");
            }

            String token = UUID.randomUUID().toString();
            UserSecurity userSecurity = user.getUserSecurity();
            userSecurity.setPasswordResetToken(token);
            userSecurity.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);

            emailService.sendPasswordResetEmail(user.getEmail(), token, resetPasswordUrlBase);
        }
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        UserSecurity userSecurity = userSecurityRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 만료된 비밀번호 재설정 토큰입니다."));

        if (userSecurity.getPasswordResetTokenExpiry() == null || userSecurity.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            userSecurity.setPasswordResetToken(null);
            userSecurity.setPasswordResetTokenExpiry(null);
            userSecurityRepository.save(userSecurity);
            throw new IllegalArgumentException("비밀번호 재설정 토큰이 만료되었습니다.");
        }
        User user = userSecurity.getUser();
        if (!(user.getProvider() == User.AuthProvider.LOCAL)) {
            throw new IllegalStateException("소셜 로그인 사용자는 이 기능을 통해 비밀번호를 변경할 수 없습니다.");
        }

        userSecurity.setPassword(passwordEncoder.encode(newPassword));
        userSecurity.setPasswordResetToken(null);
        userSecurity.setPasswordResetTokenExpiry(null);
        userSecurityRepository.save(userSecurity);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(User currentUser) {
        return new UserProfileResponse(currentUser);
    }

    @Transactional
    public UserProfileResponse updateUserProfile(UserProfileRequest userProfileRequest, User currentUser) {
        currentUser.setName(userProfileRequest.getName());
        currentUser.getUserProfile().setIntroduce(userProfileRequest.getIntroduce());

        User updatedUser = userRepository.save(currentUser);
        logger.info("프로필 정보 업데이트 성공 | 사용자: {}", currentUser.getEmail());
        return new UserProfileResponse(updatedUser);
    }

    @Transactional
    public UserProfileResponse updateUserAvatar(MultipartFile avatarFile, User currentUser) {
        if (avatarFile.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("아바타 파일 크기는 5MB를 초과할 수 없습니다.");
        }
        String contentType = avatarFile.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new IllegalArgumentException("아바타 파일은 JPEG 또는 PNG 형식만 지원됩니다.");
        }

        String oldAvatarUrl = currentUser.getUserProfile().getAvatarUrl();
        String newStoredFilename = storageService.store(avatarFile, currentUser.getId().toString());
        String newAbsoluteAvatarUrl = serverBaseUrl + (avatarUrlPath.startsWith("/") ? avatarUrlPath : "/" + avatarUrlPath) + newStoredFilename;

        currentUser.getUserProfile().setAvatarUrl(newAbsoluteAvatarUrl);
        User updatedUser = userRepository.save(currentUser);

        if (oldAvatarUrl != null && oldAvatarUrl.startsWith(serverBaseUrl)) {
            try {
                String oldFilename = oldAvatarUrl.substring(oldAvatarUrl.lastIndexOf('/') + 1);
                storageService.delete(oldFilename);
            } catch (Exception e) {
                logger.error("이전 아바타 파일 삭제 실패 '{}'", oldAvatarUrl, e);
            }
        }
        logger.info("아바타 업데이트 성공 | 사용자: {}", currentUser.getEmail());
        return new UserProfileResponse(updatedUser);
    }


    @Transactional
    public void changePassword(ChangePasswordRequest changePasswordRequest, User currentUser) {
        UserSecurity userSecurity = currentUser.getUserSecurity();
        if (userSecurity == null || userSecurity.getPassword() == null) {
            throw new AccessDeniedException("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
        }
        if (!passwordEncoder.matches(changePasswordRequest.getCurrentPassword(), userSecurity.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        userSecurity.setPassword(passwordEncoder.encode(changePasswordRequest.getNewPassword()));
        userSecurityRepository.save(userSecurity);
        logger.info("비밀번호 변경 성공 | 사용자: {}", currentUser.getEmail());
    }

    public User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal().toString())) {
            throw new IllegalStateException("사용자 인증이 되지 않았습니다.");
        }
        String userEmail = authentication.getName();
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("인증된 사용자를 찾을 수 없습니다: " + userEmail));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailWithSecurity(email)
                .orElseThrow(() -> new UsernameNotFoundException("해당 이메일로 사용자를 찾을 수 없습니다: " + email));

        if (!user.isEmailVerified()) {
            logger.warn("비활성화된(이메일 미인증) 계정으로 로그인 시도: {}", email);
            throw new DisabledException("이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.");
        }

        UserSecurity userSecurity = user.getUserSecurity();
        if (userSecurity == null || userSecurity.getPassword() == null) {
            throw new BadCredentialsException("이메일/비밀번호 로그인을 지원하지 않는 계정입니다.");
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                userSecurity.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    @Transactional
    public void generateAndSendTwoFactorCode(User user) {

        UserSecurity userSecurity = user.getUserSecurity();
        if (userSecurity == null) { throw new IllegalStateException("사용자의 보안 정보를 찾을 수 없습니다."); }

        String code = String.format("%06d", new SecureRandom().nextInt(999999));

        userSecurity.setTwoFactorCode(code);
        userSecurity.setTwoFactorCodeExpiry(LocalDateTime.now().plusMinutes(10));
        userSecurityRepository.save(userSecurity);

        emailService.sendTwoFactorCodeEmail(user.getEmail(), code);
        logger.info("2FA 코드 발송 완료 | 사용자: {}", user.getEmail());
    }


    @Transactional
    public User verifyTwoFactorCode(String email, String code) {
        User user = userRepository.findByEmailWithSecurity(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));

        UserSecurity userSecurity = user.getUserSecurity();
        if (userSecurity == null || userSecurity.getTwoFactorCode() == null || userSecurity.getTwoFactorCodeExpiry() == null) {
            throw new IllegalArgumentException("2FA 코드가 생성되지 않았습니다.");
        }
        if (userSecurity.getTwoFactorCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("인증 코드가 만료되었습니다. 다시 로그인해주세요.");
        }

        if (!userSecurity.getTwoFactorCode().equals(code)) {
            throw new IllegalArgumentException("인증 코드가 일치하지 않습니다.");
        }

        userSecurity.setTwoFactorCode(null);
        userSecurity.setTwoFactorCodeExpiry(null);
        userSecurityRepository.save(userSecurity);

        logger.info("2FA 코드 검증 성공 | 사용자: {}", email);
        return user;
    }

    @Transactional
    public void setTwoFactorEnabled(User currentUser, boolean enabled) {
        UserSecurity userSecurity = currentUser.getUserSecurity();
        if (userSecurity == null) { throw new IllegalStateException("사용자의 보안 정보를 찾을 수 없습니다."); }
        userSecurity.setTwoFactorEnabled(enabled);
        if (!enabled) {
            userSecurity.setTwoFactorCode(null);
            userSecurity.setTwoFactorCodeExpiry(null);
        }
        userSecurityRepository.save(userSecurity);
        logger.info("2FA 설정 변경 -> {} | 사용자: {}", enabled, currentUser.getEmail());
    }
}