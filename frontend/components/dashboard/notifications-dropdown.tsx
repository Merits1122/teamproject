"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ApiNotification } from "@/lib/types"
import { apiCall } from "@/lib/api"
import { useRouter } from "next/navigation"
import { differenceInSeconds, formatDistanceToNow, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { getToken } from "@/lib/auth"
import { fetchEventSource } from '@microsoft/fetch-event-source';

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

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if(!isOpen) setIsLoading(false);
    const response = await apiCall<ApiNotification[]>('/api/notifications');
    if (response.success) {
      setNotifications(response.data);
    }
    setIsLoading(false);
  }, [isOpen]);
  
  useEffect(() => {
    fetchNotifications();

    const token = getToken();
    if (!token) return;

    const ctrl = new AbortController();
    
    fetchEventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/notifications/subscribe`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: ctrl.signal,
        onmessage(event) {
          if (event.event === 'new-notification') {
            const newNotification = JSON.parse(event.data);
            setNotifications(prev => [newNotification, ...prev]);
          }
          if (event.event === 'project-updated'){
            const data = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('projectDataShouldRefresh', { 
              detail: { projectId: data.projectId } 
            }));
          }
        },
        onerror(err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            console.log("SSE 연결이 정상적으로 중단되었습니다.");
          } else {
            console.error("SSE 연결에 심각한 오류가 발생했습니다:", err);
            throw err; 
          }
        }
    });

    const handleUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('notificationsUpdated', handleUpdate);
    
    return () => {
      ctrl.abort();
      window.removeEventListener('notificationsUpdated', handleUpdate);
    };
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: ApiNotification) => {
    const isUnread = notification.isRead === false;
    
    router.push(notification.link);
    setIsOpen(false);

    if (isUnread) {
      const response = await apiCall(`/api/notifications/${notification.id}/read`, { method: 'POST' });
      if (response.success) {
        router.refresh();
      }
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    const response = await apiCall('/api/notifications/read-all', { method: 'POST' });
    if (!response.success) {
      fetchNotifications(); 
    } else {
      router.refresh();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-100">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>알림</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-1 h-4 w-4" />
              모두 읽음
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : notifications.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn("flex cursor-pointer items-start gap-3 p-3", !notification.isRead && "bg-blue-500/10")}
                onClick={() => handleNotificationClick(notification)}
                style={{ whiteSpace: 'normal', height: 'auto' }}
              >
                <Avatar className="h-9 w-9 mt-1">
                  <AvatarImage src={notification.user?.avatarUrl || undefined} />
                  <AvatarFallback>{getInitials(notification.user?.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 text-xs">
                  <p className="font-semibold text-sm leading-none">{notification.title}</p>
                  <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: notification.description }} />
                  <p className="text-muted-foreground">
                    {formatCommentTimestamp(notification.createdAt)}
                  </p>
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
