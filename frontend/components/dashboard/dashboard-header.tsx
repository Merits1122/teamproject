"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { NotificationsDropdown } from "./notifications-dropdown"
import { ProfileDropdown } from "./profile-dropdown"
import { removeToken } from "@/lib/auth";

export function DashboardHeader() {
  const router = useRouter()

  const handleLogout = () => {
    
    removeToken();

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
