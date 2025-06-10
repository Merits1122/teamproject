"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { NotificationsDropdown } from "./notifications-dropdown"
import { ProfileDropdown } from "./profile-dropdown"

export function DashboardHeader() {
  const router = useRouter()

  const handleLogout = () => {
    // 토큰 및 사용자 데이터 제거
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    sessionStorage.removeItem("token")
    sessionStorage.removeItem("refreshToken")
    sessionStorage.removeItem("user")

    // 쿠키에서 토큰 제거 (만약 쿠키를 사용한다면)
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    // 실제 앱에서는 로그아웃 API 호출 후 리디렉션
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/dashboard" className="flex items-center">
          <span className="font-bold text-xl">TaskFlow</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsDropdown />
        <ProfileDropdown onLogout={handleLogout} />
      </div>
    </header>
  )
}
