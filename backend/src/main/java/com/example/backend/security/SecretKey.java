package com.example.backend.security;


import java.security.SecureRandom;
import java.util.Base64;

public class SecretKey {
    public static void main(String[] args) {
        SecureRandom random = new SecureRandom();
        byte[] keyBytes = new byte[32];
        random.nextBytes(keyBytes);
        String secretKey = Base64.getEncoder().encodeToString(keyBytes);
        System.out.println("Secret Key: " + secretKey);
    }
}
