package com.example.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = jwtTokenProvider.resolveToken(request);
        logger.debug("토큰 요청 확인 {}: {}", request.getRequestURI(), (token != null ? "Present" : "Absent"));

        if (token == null || !jwtTokenProvider.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 이 아래 코드는 토큰이 유효한 경우에만 실행됨
        Authentication authentication = jwtTokenProvider.getAuthentication(token);
        if (authentication != null) {
            SecurityContextHolder.getContext().setAuthentication(authentication);
            logger.info("인증 성공: {}", authentication.getName());
        } else {
            logger.warn("토큰에서 인증 정보 생성 실패. Token: {}", token);
        }

        filterChain.doFilter(request, response);
    }
}