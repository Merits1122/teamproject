package com.example.backend.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;


@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebConfig.class);

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.avatar-url-path}")
    private String avatarUrlPath;

    private final CurrentUserArgumentResolver currentUserArgumentResolver;

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserArgumentResolver);
    }

    //아바타 폴더 위치
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path avatarUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String resourceLocation = avatarUploadPath.toUri().toString();
        String urlPathPattern = avatarUrlPath.endsWith("/") ? avatarUrlPath + "**" : avatarUrlPath + "/**";

        logger.info("아바타 URL = '{}', 전체 경로 = '{}'", urlPathPattern, resourceLocation);

        registry.addResourceHandler(urlPathPattern).addResourceLocations(resourceLocation);
    }
}