"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function NotificationSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    taskAssigned: true,
    taskUpdated: true,
    taskCommented: true,
    projectInvitation: true,
    projectUpdated: false,
    dailyDigest: false,
    weeklyDigest: true,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)

    try {
      // 실제 앱에서는 API 호출을 여기서 수행합니다
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "설정이 저장되었습니다",
        description: "알림 환경설정이 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "알림 설정을 저장하는 중 문제가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
              <Label htmlFor="project-invitation">프로젝트에 초대받을 때</Label>
              <Switch
                id="project-invitation"
                checked={settings.projectInvitation}
                onCheckedChange={() => handleToggle("projectInvitation")}
                disabled={!settings.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="project-updated">내가 속한 프로젝트가 업데이트될 때</Label>
              <Switch
                id="project-updated"
                checked={settings.projectUpdated}
                onCheckedChange={() => handleToggle("projectUpdated")}
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
