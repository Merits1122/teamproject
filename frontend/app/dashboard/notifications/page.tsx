"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { apiCall } from "@/lib/api"
import { ApiNotification } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { parseISO, differenceInSeconds, formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};

const formatCommentTimestamp = (timestamp?: string): string => {
    if (!timestamp) return "방금 전";
    const date = parseISO(timestamp);
    if (differenceInSeconds(new Date(), date) < 60) {
        return "방금 전";
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};


export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    const response = await apiCall<ApiNotification[]>('/api/notifications');
    if (response.success) {
      setNotifications(response.data);
    } 
    setIsLoading(false);
  }, []);
  
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.isRead;
    if (activeTab === "comment") return notification.type === "TASK_COMMENT";
    if (activeTab === "task") return notification.type.startsWith("TASK_");
    if (activeTab === "invitation") return notification.type === "PROJECT_INVITATION";
    return true;
  });

  const handleNotificationClick = async (notification: ApiNotification) => {
    if (!notification.isRead) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      await apiCall(`/api/notifications/${notification.id}/read`, { method: 'POST' });
    }
    window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    router.push(notification.link);
  };
  
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await apiCall('/api/notifications/read-all', { method: 'POST' });
    window.dispatchEvent(new CustomEvent('notificationsUpdated'));
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      </div>
  }
  

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">알림</h1>
          <p className="text-muted-foreground">모든 알림을 확인하고 관리하세요.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
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
            <Badge variant={unreadCount > 0 ? "destructive" : "secondary"} className="ml-2">
              {unreadCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="comment">댓글</TabsTrigger>
          <TabsTrigger value="task">업무</TabsTrigger>
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
                        ? "업무 알림"
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
                    <Link key={notification.id} href={notification.link} passHref>
                    <div
                      className={cn(
                        "flex cursor-pointer items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50",
                        !notification.isRead && "bg-muted/50",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.user?.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(notification.user?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCommentTimestamp(notification.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: notification.description }} />
                      </div>
                      {!notification.isRead && <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>}
                    </div>
                    </Link>
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


