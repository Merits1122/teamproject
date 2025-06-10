"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 샘플 알림 데이터
const initialNotifications = [
  {
    id: 1,
    title: "새 댓글이 추가되었습니다",
    description: "홍길동님이 '웹사이트 리디자인' 프로젝트에 댓글을 남겼습니다.",
    time: "방금 전",
    read: false,
    type: "comment",
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
    type: "task",
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
    type: "deadline",
    user: {
      name: "시스템",
      avatar: "",
      initials: "S",
    },
  },
  {
    id: 4,
    title: "프로젝트에 초대되었습니다",
    description: "이영희님이 '데이터 분석 대시보드' 프로젝트에 초대했습니다.",
    time: "어제",
    read: true,
    type: "invitation",
    user: {
      name: "이영희",
      avatar: "",
      initials: "이",
    },
  },
  {
    id: 5,
    title: "작업이 완료되었습니다",
    description: "박민수님이 '모바일 앱 개발' 프로젝트의 작업을 완료했습니다.",
    time: "2일 전",
    read: true,
    type: "task",
    user: {
      name: "박민수",
      avatar: "",
      initials: "박",
    },
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [activeTab, setActiveTab] = useState("all")

  const unreadCount = notifications.filter((n) => !n.read).length

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.read
    return notification.type === activeTab
  })

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">알림</h1>
          <p className="text-muted-foreground">모든 알림을 확인하고 관리하세요.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            모두 읽음 표시
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            전체
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            읽지 않음
            <Badge variant="secondary" className="ml-2">
              {unreadCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="comment">댓글</TabsTrigger>
          <TabsTrigger value="task">작업</TabsTrigger>
          <TabsTrigger value="invitation">초대</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all"
                  ? "모든 알림"
                  : activeTab === "unread"
                    ? "읽지 않은 알림"
                    : activeTab === "comment"
                      ? "댓글 알림"
                      : activeTab === "task"
                        ? "작업 알림"
                        : "초대 알림"}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length > 0
                  ? `${filteredNotifications.length}개의 알림이 있습니다.`
                  : "알림이 없습니다."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50",
                        !notification.read && "bg-muted/50",
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.user.avatar || ""} />
                        <AvatarFallback>{notification.user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{notification.title}</p>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                      </div>
                      {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>}
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">알림이 없습니다.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
