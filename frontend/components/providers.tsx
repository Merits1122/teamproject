"use client";

import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn(
      "Google Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID)가 설정되지 않았습니다. .env.local 파일을 확인해주세요. 구글 로그인이 작동하지 않을 수 있습니다."
    );
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