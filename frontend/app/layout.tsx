// app/layout.tsx
import type React from "react" // React 임포트
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import { ThemeProvider } from "@/components/theme-provider"; // ⬅️ 여기서 직접 사용하지 않음
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"; // ⬅️ 새로 만든 Providers 컴포넌트 임포트
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TaskFlow - Team Project Management",
  description: "Manage your team projects with ease",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const googleAuthClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  if (!googleAuthClientId) {
    console.error("Google Client ID is not defined in environment variables.");
    // 클라이언트 ID가 없을 경우를 대비한 처리
  }
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleOAuthProvider clientId={googleAuthClientId}> {/* ⬅️ 이 Provider로 감싸줍니다 */}
          {children}
          <Toaster />
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}