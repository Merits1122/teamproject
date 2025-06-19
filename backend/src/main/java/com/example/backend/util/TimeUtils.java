package com.example.backend.util;


import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.time.Period;

public class TimeUtils {


    // 모든 시간은 유튜브 마냥 00초전. 분전, 시간전, 주전, 달전, 년 전으로 표시 됩니다
    public static String getTimeAgo(LocalDateTime createdAt) {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) return "작성 시간 없음";
        // 1) 초, 분, 시간, 일 계산을 위한 Duration
        Duration duration = Duration.between(createdAt, now);
        long seconds = duration.getSeconds();
        long minutes = duration.toMinutes();
        long hours = duration.toHours();
        long days = duration.toDays();

        // 2) 연, 월, 일 계산을 위한 Period
        LocalDate startDate = createdAt.toLocalDate();
        LocalDate endDate = now.toLocalDate();
        Period period = Period.between(startDate, endDate);
        int years = period.getYears();
        int months = period.getMonths();
        int totalDays = period.getDays(); // 년·월을 제외한 순수 일 수

        // --- 세부 표시 기준 ---
        // 1) 1년 전 이상
        if (years > 0) {
            return years + "년 전";
        }

        // 2) 1달 전 이상 (총 개월 수 계산: years * 12 + months)
        int totalMonths = years * 12 + months;
        if (totalMonths > 0) {
            return totalMonths + "달 전";
        }

        // 3) 1주 전 이상 (days 기준)
        if (days >= 7) {
            long weeks = days / 7;
            return weeks + "주 전";
        }

        // 4) 1일 전 이상
        if (days > 0) {
            return days + "일 전";
        }

        // 5) 1시간 전 이상
        if (hours > 0) {
            return hours + "시간 전";
        }

        // 6) 1분 전 이상
        if (minutes > 0) {
            return minutes + "분 전";
        }

        // 7) 그 외: 초 전
        if (seconds > 0) {
            return seconds + "초 전";
        }

        // 8) 생성 시각이 현재 시각과 거의 동일(0초 이내 차이)일 경우
        return "방금 전";
    }
}