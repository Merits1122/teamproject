package com.example.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Base64;
import java.util.Date;


@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${jwt.secret}")
    private String base64EncodedSecretKey;

    @Value("${jwt.validity-in-ms}")
    private long validityInMilliseconds;
    private Key key;

    private final UserDetailsService userDetailsService;

    public JwtTokenProvider(@Lazy UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }
    private static final String KEY_ROLE = "role"; //

    @PostConstruct
    protected void init() {
        if (this.base64EncodedSecretKey == null || this.base64EncodedSecretKey.trim().isEmpty()) {
            logger.error("JWT 시크릿 키가 설정 되지 않음");
            throw new IllegalStateException("JWT 시크릿 키가 설정되지 않았습니다.");
        }
        try {
            byte[] keyBytes = Base64.getDecoder().decode(base64EncodedSecretKey);
            this.key = Keys.hmacShaKeyFor(keyBytes);
            logger.info("시크릿 키 Base64 형식으로 초기화 성공");
        } catch (IllegalArgumentException e) {
            logger.error("잘못된 Base64 형식: {}", base64EncodedSecretKey, e);
            throw new IllegalStateException("잘못된 Base64 형식의 JWT 시크릿 키입니다.", e);
        }
    }

    public String createToken(String subjectOrEmail, String role) {
        Claims claims = Jwts.claims().setSubject(subjectOrEmail);
        claims.put(KEY_ROLE, role);
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Authentication getAuthentication(String token) {
        String email = getEmail(token);
        if (email == null) return null;
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        if (userDetails == null) return null;
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    public String getEmail(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(this.key).build()
                    .parseClaimsJws(token).getBody().getSubject();
        } catch (ExpiredJwtException e) {
            logger.warn("JWT token: {}", e.getMessage());
        } catch (JwtException e) {
            logger.error("이메일 분석 실패: {}", e.getMessage());
        }
        return null;
    }

    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(this.key).build().parseClaimsJws(token);
            logger.debug("토큰 검증 성공");
            return true;
        } catch (ExpiredJwtException e) {
            logger.warn("만료된 토큰: {}", e.getMessage());
        } catch (JwtException | IllegalArgumentException e) {
            logger.warn("토큰 검증 실패 : {}", e.getMessage());
        }
        return false;
    }
}