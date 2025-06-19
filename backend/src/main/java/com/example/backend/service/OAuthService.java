package com.example.backend.service;

import com.example.backend.dto.GoogleLoginRequest;
import com.example.backend.dto.LoginResponse;
import com.example.backend.entity.user.User;
import com.example.backend.entity.user.User.AuthProvider;
import com.example.backend.entity.user.UserProfile;
import com.example.backend.entity.user.UserSecurity;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuthService {
    private static final Logger logger = LoggerFactory.getLogger(OAuthService.class);

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final GoogleIdTokenVerifier verifier;

    public OAuthService(UserRepository userRepository,
                       JwtTokenProvider jwtTokenProvider,
                       PasswordEncoder passwordEncoder,
                       @Value("${google.oauth.client.id}") String googleClientId) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Transactional
    public LoginResponse loginWithGoogle(GoogleLoginRequest googleLoginRequest) throws GeneralSecurityException, IOException {
        GoogleIdToken idToken = verifier.verify(googleLoginRequest.getIdToken());
        if (idToken == null) {
            throw new IllegalArgumentException("유효하지 않은 Google ID 토큰입니다.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String googleUserId = payload.getSubject();
        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        Optional<User> userOptional = userRepository.findByEmail(email);

        User user;
        if (userOptional.isPresent()) {
            user = userOptional.get();
            logger.info("이미 가입 중인 이메일 입니다. : {}.", email);
            if (user.getProvider() == AuthProvider.LOCAL && user.getGoogleId() == null) {
                logger.info("이미 사용중인 로컬 계정이 있습니다. 구글과 연동 처리함");
                user.setGoogleId(googleUserId);
                user.setProvider(AuthProvider.GOOGLE);
                user = userRepository.save(user);
            } else if (user.getProvider() != AuthProvider.GOOGLE) {
                throw new IllegalStateException("해당 이메일은 이미 다른 소셜 계정으로 가입되어 있습니다.");
            }
        } else {
            logger.info("새로운 사용자, 이메일 생성: {}", email);

            User newUser = User.builder()
                    .email(email)
                    .name(name)
                    .googleId(googleUserId)
                    .provider(AuthProvider.GOOGLE)
                    .emailVerified(true)
                    .build();

            UserProfile newProfile = new UserProfile();
            newProfile.setAvatarUrl(pictureUrl);

            UserSecurity newSecurity = new UserSecurity();
            newSecurity.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

            newUser.setUserProfile(newProfile);
            newUser.setUserSecurity(newSecurity);

            user = userRepository.save(newUser);
            logger.info("새로운 계정 생성 완료: {}", email);
        }
        String userRoleOrType = user.getProvider().name();
        String appToken = jwtTokenProvider.createToken(user.getEmail(), userRoleOrType);

        return new LoginResponse(appToken, user);
    }
}