package com.example.backend.controller;

import com.example.backend.dto.*;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenProvider;
import com.example.backend.service.OAuthService;
import com.example.backend.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.GeneralSecurityException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final OAuthService oAuthService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public AuthController(UserService userService,
                          OAuthService oAuthService,
                          AuthenticationConfiguration authenticationConfiguration,
                          JwtTokenProvider jwtTokenProvider,
                          UserRepository userRepository) throws Exception{
        this.userService = userService;
        this.oAuthService = oAuthService;
        this.authenticationManager = authenticationConfiguration.getAuthenticationManager();
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    //회원가입
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@Valid @RequestBody SignupRequest signupRequest) {
        try {
            userService.signup(signupRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body("회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.");
        } catch (IllegalArgumentException e) {
            logger.warn("회원가입 실패 (중복된 이메일 등): {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("회원가입 처리 중 알 수 없는 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("회원가입 중 오류가 발생했습니다.");
        }
    }

    //이메일 인증
    @GetMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        try {
            userService.verifyEmail(token);
            return ResponseEntity.ok("이메일 인증이 성공적으로 완료되었습니다. 이제 로그인할 수 있습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("이메일 인증 처리 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("이메일 인증 중 오류가 발생했습니다.");
        }
    }

    //로그인
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        logger.info("로그인 시도 | 이메일: {}", loginRequest.getEmail());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByEmailWithSecurity(loginRequest.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("인증은 성공했으나 DB에서 사용자를 찾을 수 없습니다: " + loginRequest.getEmail()));

            logger.info("사용자 '{}' 인증 성공. 계정 상태 확인 중...", user.getEmail());

            if (!user.isEmailVerified()) {
                logger.warn("로그인 시도 거부 (이메일 미인증) | 사용자: '{}'", user.getEmail());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.");
            }

            if (user.getUserSecurity() != null && user.getUserSecurity().isTwoFactorEnabled()) {
                logger.info("2FA 활성화됨 | 사용자: '{}'. 코드 생성 및 발송.", user.getEmail());
                userService.generateAndSendTwoFactorCode(user);
                return ResponseEntity.ok(new LoginResponse(true, "2단계 인증 코드를 입력해주세요."));
            } else {
                logger.info("2FA 비활성화됨 | 사용자: '{}'. JWT 발급.", user.getEmail());
                String roleOrProvider = user.getProvider().name();
                String token = jwtTokenProvider.createToken(user.getEmail(), roleOrProvider);
                return ResponseEntity.ok(new LoginResponse(token, user));
            }
        }  catch (AuthenticationException e) {
            logger.warn("로그인 실패 (자격 증명 오류) | 이메일: '{}', 원인: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("이메일 또는 비밀번호가 올바르지 않습니다.");
        } catch (Exception e) {
            logger.error("!!! 로그인 처리 중 내부 서버 오류 발생 | 이메일: '{}' !!!", loginRequest.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("로그인 중 오류가 발생했습니다.");
        }
    }

    //구글로그인
    @PostMapping("/google/login")
    public ResponseEntity<?> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest googleLoginRequest) {
        try {
            LoginResponse loginResponse = oAuthService.loginWithGoogle(googleLoginRequest);
            return ResponseEntity.ok(loginResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (GeneralSecurityException | IOException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Google 인증에 실패했습니다.");
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Google 로그인 처리 중 오류가 발생했습니다.");
        }
    }

    //비밀번호 찾기
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest) {
        try {
            userService.requestPasswordReset(forgotPasswordRequest.getEmail());
            return ResponseEntity.ok().body("해당 이메일 주소로 비밀번호 재설정 안내 메일이 발송됩니다.");
        } catch (Exception e) {
            logger.error("비밀번호 재설정 요청 처리 중 오류 발생", e);
            return ResponseEntity.ok().body("비밀번호 재설정 요청이 처리되었습니다. 이메일을 확인해주세요.");
        }
    }

    //비밀번호 초기화
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest resetPasswordRequest) {
        try {
            userService.resetPassword(resetPasswordRequest.getToken(), resetPasswordRequest.getNewPassword());
            return ResponseEntity.ok().body("비밀번호가 성공적으로 변경되었습니다.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("비밀번호 변경 처리 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("비밀번호 변경 중 오류가 발생했습니다.");
        }
    }

    //2단계 인증
    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verifyTwoFactor(
            @Valid @RequestBody TwoFactorRequest twoFactorRequest) {
        try {
            User user = userService.verifyTwoFactorCode(twoFactorRequest.getEmail(), twoFactorRequest.getCode());

            String roleOrProvider = user.getProvider().name();
            String token = jwtTokenProvider.createToken(user.getEmail(), roleOrProvider);
            return ResponseEntity.ok(new LoginResponse(token, user));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}