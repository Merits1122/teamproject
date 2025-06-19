"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings, FolderKanban } from "lucide-react"

const navItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "프로젝트",
    href: "/dashboard/project",
    icon: FolderKanban,
  },
  {
    title: "설정",
    href: "/dashboard/setting",
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  const getIsActive = (href: string, pathname: string) => {
    if (pathname === href) return true

    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }

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
