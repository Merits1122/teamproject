// components/providers.tsx
"use client"; // ⬅️ 클라이언트 컴포넌트로 명시

import React from "react";
import { ThemeProvider } from "@/components/theme-provider"; // 기존 ThemeProvider
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn(
      "Google Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID)가 설정되지 않았습니다. .env.local 파일을 확인해주세요. 구글 로그인이 작동하지 않을 수 있습니다."
    );
    // 클라이언트 ID가 없는 경우 GoogleOAuthProvider를 렌더링하지 않거나,
    // 사용자에게 알림을 표시하고 children만 렌더링할 수 있습니다.
    // 여기서는 GoogleOAuthProvider 없이 ThemeProvider만 적용합니다.
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GoogleOAuthProvider clientId={googleClientId}>
        {children}
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}