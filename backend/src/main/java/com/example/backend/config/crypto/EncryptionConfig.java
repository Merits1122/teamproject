// com.example.backend.config.crypto.EncryptionConfig.java

package com.example.backend.config.crypto;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EncryptionConfig {

    @Value("${encryption.secret-key}")
    private String secretKey;

    @PostConstruct
    public void init() {
        CryptoConverter.setSecretKey(secretKey);
    }
}