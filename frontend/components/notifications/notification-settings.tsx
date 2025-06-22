"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ApiNotificationSettings } from "@/lib/types"
import { apiCall } from "@/lib/api"
import { Loader2 } from "lucide-react"

export function NotificationSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<ApiNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const response = await apiCall<ApiNotificationSettings>('/api/user/profile/notification-settings');
      if(response.success) {
        setSettings(response.data);
      } else {
        toast({ title: "설정 로딩 실패", description: response.error.message, variant: "destructive" });
      }
      setIsLoading(false);
    }
    fetchSettings();
  }, [toast]);
  
  const handleToggle = (setting: keyof ApiNotificationSettings) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [setting]: !prev[setting] } : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const response = await apiCall<ApiNotificationSettings>('/api/user/profile/notification-settings', {
        method: "PUT",
        body: JSON.stringify(settings),
    });

    if(response.success) {
        toast({ title: "저장 완료", description: "알림 설정이 업데이트되었습니다." });
        setSettings(response.data);
    } else {
        toast({ title: "저장 실패", description: response.error.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return 
    <div className="text-center p-8">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  }
  
  if (!settings) {
    return <div className="text-center p-8 text-destructive">알림 설정을 불러오지 못했습니다.</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
        <CardDescription>알림을 받는 방법과 시기를 관리하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
              <span>이메일 알림</span>
              <span className="font-normal text-sm text-muted-foreground">이메일을 통해 알림 받기</span>
            </Label>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>

          <div className="ml-6 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-assigned">작업이 나에게 할당될 때</Label>
              <Switch
                id="task-assigned"
                checked={settings.taskAssigned}
                onCheckedChange={() => handleToggle("taskAssigned")}
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="task-updated">내가 할당된 작업이 업데이트될 때</Label>
              <Switch
                id="task-updated"
                checked={settings.taskUpdated}
                onCheckedChange={() => handleToggle("taskUpdated")}
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="task-commented">누군가 내 작업에 댓글을 달 때</Label>
              <Switch
                id="task-commented"
                checked={settings.taskCommented}
                onCheckedChange={() => handleToggle("taskCommented")}
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="task-duedate">마감일이 임박했을 때</Label>
              <Switch
                id="task-duedate"
                checked={settings.taskDueDate}
                onCheckedChange={() => handleToggle("taskDueDate")}
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="project-invitation">프로젝트에 초대받을 때</Label>
              <Switch
                id="project-invitation"
                checked={settings.projectInvitation}
                onCheckedChange={() => handleToggle("projectInvitation")}
                disabled={!settings.emailNotifications}
              />
            </div>

          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">요약 이메일</h3>

          <div className="flex items-center justify-between">
            <Label htmlFor="daily-digest" className="flex flex-col space-y-1">
              <span>일일 요약</span>
              <span className="font-normal text-sm text-muted-foreground">매일 활동 요약 받기</span>
            </Label>
            <Switch
              id="daily-digest"
              checked={settings.dailyDigest}
              onCheckedChange={() => handleToggle("dailyDigest")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-digest" className="flex flex-col space-y-1">
              <span>주간 요약</span>
              <span className="font-normal text-sm text-muted-foreground">매주 활동 요약 받기</span>
            </Label>
            <Switch
              id="weekly-digest"
              checked={settings.weeklyDigest}
              onCheckedChange={() => handleToggle("weeklyDigest")}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? "저장 중..." : "설정 저장"}
        </Button>
      </CardContent>
    </Card>
  )
}
