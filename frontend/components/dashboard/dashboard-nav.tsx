"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings, FolderKanban } from "lucide-react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/dashboard/project", // 변경: projects -> project
    icon: FolderKanban,
  },
  {
    title: "Settings",
    href: "/dashboard/setting", // 변경: settings -> setting
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  const getIsActive = (href: string, pathname: string) => {
    // 정확히 일치하는 경우
    if (pathname === href) return true

    // Dashboard의 경우 정확히 일치할 때만 활성화
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }

    // 다른 경로의 경우 하위 경로도 포함
    return pathname?.startsWith(`${href}/`)
  }

  return (
    <nav className="hidden border-r bg-background md:block md:w-64">
      <div className="flex h-full flex-col gap-2 p-4">
        {navItems.map((item) => {
          const isActive = getIsActive(item.href, pathname || "")
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-2", isActive && "bg-secondary")}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
