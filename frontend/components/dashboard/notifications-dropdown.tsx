"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 샘플 알림 데이터
const notifications = [
  {
    id: 1,
    title: "새 댓글이 추가되었습니다",
    description: "홍길동님이 '웹사이트 리디자인' 프로젝트에 댓글을 남겼습니다.",
    time: "방금 전",
    read: false,
    user: {
      name: "홍길동",
      avatar: "",
      initials: "홍",
    },
  },
  {
    id: 2,
    title: "작업이 할당되었습니다",
    description: "김철수님이 '모바일 앱 개발' 프로젝트에서 작업을 할당했습니다.",
    time: "1시간 전",
    read: false,
    user: {
      name: "김철수",
      avatar: "",
      initials: "김",
    },
  },
  {
    id: 3,
    title: "프로젝트 마감일 임박",
    description: "'마케팅 캠페인' 프로젝트의 마감일이 3일 남았습니다.",
    time: "3시간 전",
    read: true,
    user: {
      name: "시스템",
      avatar: "",
      initials: "S",
    },
  },
]

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState(notifications)
  const unreadCount = notifs.filter((n) => !n.read).length

  const markAsRead = (id: number) => {
    setNotifs((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifs((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>알림</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              모두 읽음 표시
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifs.length > 0 ? (
          <div className="max-h-[300px] overflow-y-auto">
            {notifs.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn("flex cursor-pointer gap-4 p-3", !notification.read && "bg-muted/50")}
                onClick={() => markAsRead(notification.id)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={notification.user.avatar || ""} />
                  <AvatarFallback>{notification.user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.description}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">새로운 알림이 없습니다</div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center" asChild>
          <Link href="/dashboard/notifications">모든 알림 보기</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
