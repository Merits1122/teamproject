import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
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
    console.error("구글 클라이언트 ID를 찾을 수 없습니다.");
  }
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleOAuthProvider clientId={googleAuthClientId}>
          {children}
          <Toaster />
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}