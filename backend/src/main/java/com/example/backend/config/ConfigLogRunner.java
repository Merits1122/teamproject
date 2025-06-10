package com.example.backend.config; // 실제 프로젝트의 패키지 경로에 맞게 수정

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ConfigLogRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(ConfigLogRunner.class);

    // 확인할 주요 설정 값들을 @Value로 주입받습니다.
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username}")
    private String dbUsername;

    // Spring Profile이 활성화되었는지 확인하기 위해 추가
    @Value("${spring.profiles.active:default}") // 값이 없으면 'default'를 사용
    private String activeProfile;

    @Override
    public void run(String... args) throws Exception {
        logger.info("=============================================================");
        logger.info("======      실행 환경 설정값 확인 (Configuration Check)      ======");
        logger.info("=============================================================");
        // 보안을 위해 실제 키 값 전체를 노출하지 않고, 일부만 로깅합니다.
        logger.info("JWT Secret Key (Loaded) : [{}]", jwtSecret != null && !jwtSecret.isEmpty() ? jwtSecret.substring(0, Math.min(jwtSecret.length(), 4)) + "..." : "NOT FOUND");
        logger.info("Database URL (Loaded)   : [{}]", dbUrl);
        logger.info("Database Username (Loaded): [{}]", dbUsername);
        logger.info("Active Spring Profile   : [{}]", activeProfile);
        logger.info("=============================================================");
    }
}