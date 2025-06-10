package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;


@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebConfig.class);

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.avatar-url-path}")
    private String avatarUrlPath;

    //아바타 폴더 위치
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path avatarUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String resourceLocation = avatarUploadPath.toUri().toString();
        String urlPathPattern = avatarUrlPath.endsWith("/") ? avatarUrlPath + "**" : avatarUrlPath + "/**";

        logger.info("URL Path Pattern = '{}', Resource Location = '{}'", urlPathPattern, resourceLocation);

        registry.addResourceHandler(urlPathPattern).addResourceLocations(resourceLocation);
    }
}