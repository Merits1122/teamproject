package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger logger = LoggerFactory.getLogger(StorageService.class);

    private final Path rootLocation;

    public StorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation); // 업로드 디렉토리 생성
            logger.info("파일 업로드 디렉토리 초기화 성공: {}", this.rootLocation);
        } catch (IOException e) {
            logger.error("파일 업로드 디렉토리를 초기화할 수 없습니다.", e);
            throw new RuntimeException("파일 업로드 디렉토리를 초기화할 수 없습니다.", e);
        }
    }

    public String store(MultipartFile file, String userId) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        if (file.isEmpty()) {
            throw new IllegalArgumentException("저장할 파일이 비어있습니다: " + originalFilename);
        }
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("상대 경로를 포함한 파일 이름은 사용할 수 없습니다: " + originalFilename);
        }

        try {
            String extension = getExtension(originalFilename);
            String filename = "user_" + userId + "_" + UUID.randomUUID().toString() + extension;
            Path destinationFile = this.rootLocation.resolve(filename).normalize().toAbsolutePath();
            if (!destinationFile.getParent().equals(this.rootLocation.toAbsolutePath())) {
                throw new IllegalArgumentException("지정된 디렉토리 외부에 파일을 저장할 수 없습니다.");
            }
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }
            logger.info("파일 저장 성공: {}", filename);
            return filename;
        } catch (IOException e) {
            logger.error("파일 저장에 실패했습니다: {}", originalFilename, e);
            throw new RuntimeException("파일 저장에 실패했습니다: " + originalFilename, e);
        }
    }

    public void delete(String filename) {
        if (filename == null || filename.isBlank()) {
            logger.warn("파일 이름이 null이거나 비어있어 삭제 작업을 건너뜁니다.");
            return;
        }
        try {
            Path fileToDelete = this.rootLocation.resolve(filename).normalize().toAbsolutePath();

            if (!fileToDelete.getParent().equals(this.rootLocation.toAbsolutePath())) {
                logger.error("지정된 저장 디렉토리 외부의 파일 삭제 시도 감지: {}", filename);
                return;
            }

            Files.deleteIfExists(fileToDelete);
            logger.info("파일 삭제 성공: {}", filename);
        } catch (IOException e) {
            logger.error("파일 삭제 실패: {}", filename, e);
        }
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < originalFilename.length() - 1) {
            return originalFilename.substring(dotIndex);
        }
        return "";
    }
}