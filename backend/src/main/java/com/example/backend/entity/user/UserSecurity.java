package com.example.backend.entity.user;

import com.example.backend.config.crypto.CryptoConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_securities")
@Getter
@Setter
@NoArgsConstructor
public class UserSecurity {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = true)
    private String password;

    @Column(name = "is_2fa_enabled", nullable = false)
    private boolean isTwoFactorEnabled = false;

    @Column(name = "two_factor_code")
    @Convert(converter = CryptoConverter.class)
    private String twoFactorCode;

    @Column(name = "two_factor_code_expiry")
    private LocalDateTime twoFactorCodeExpiry;

    @Column(name = "password_reset_token", unique = true)
    private String passwordResetToken;

    @Column(name = "password_reset_token_expiry")
    private LocalDateTime passwordResetTokenExpiry;
}