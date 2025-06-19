"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { Camera, Loader2, ServerCrash, User as UserIcon } from "lucide-react";
import { apiCall } from "@/lib/api";
import { UserProfile } from "@/lib/types"
import { removeToken } from "@/lib/auth";
import { useRouter } from "next/navigation"; 

interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

interface SettingsState {
  profile: UserProfile;
  security: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    twoFactorEnabled: boolean;
  };
  avatarFile: File | null;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SettingsPage() {
  const router = useRouter(); 
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SettingsState>({
    profile: { 
      name: "", 
      email: "", 
      introduce: "", 
      avatarUrl: null 
    },
    security: { 
      currentPassword: "", 
      newPassword: "", 
      confirmPassword: "", 
      twoFactorEnabled: false 
    },
    avatarFile: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const fetchUserProfile = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    console.log("설정 페이지: 프로필 정보 조회를 시작합니다.");
    const response = await apiCall<UserProfile>('/api/user/profile');
    if (response.success) {
      console.log("프로필 정보 조회 성공:", response.data);
      setState(prev => ({
        ...prev,
        profile: response.data,
        security: { ...prev.security, twoFactorEnabled: response.data.twoFactorEnabled || false }
      }));
    } else {
      console.error("프로필 정보 조회 실패:", response.error);
      setError("프로필 정보를 가져오는데 실패했습니다.");
      toast({ title: "오류", description: response.error.message, variant: "destructive" });
    }
    setIsFetching(false);
  }, [toast]);

  useEffect(() => { 
    fetchUserProfile(); 
  }, [fetchUserProfile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, profile: { ...prev.profile, [name]: value } }));
  };
  
  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, security: { ...prev.security, [name]: value } }));
    if (passwordErrors[name as keyof PasswordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "파일 형식 오류", description: "이미지 파일만 업로드할 수 있습니다.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setState(prev => ({ ...prev, avatarFile: file, profile: { ...prev.profile, avatarUrl: reader.result as string } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    let finalAvatarUrl = state.profile.avatarUrl;

    if (state.avatarFile) {
      const formData = new FormData();
      formData.append("avatarFile", state.avatarFile);
      const avatarResponse = await apiCall<{ avatarUrl: string }>('/api/user/profile/avatar', { 
        method: "POST", 
        body: formData
      });
      if (!avatarResponse.success) {
        toast({ title: "아바타 업로드 오류", description: avatarResponse.error.message, variant: "destructive" });
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = avatarResponse.data.avatarUrl;
    }

    const profileUpdateResponse = await apiCall<UserProfile>('/api/user/profile', {
      method: "PUT",
      body: JSON.stringify({ 
        name: state.profile.name, 
        introduce: state.profile.introduce, 
        avatarUrl: finalAvatarUrl }),
    });

    if (profileUpdateResponse.success) {
      toast({ title: "성공", description: "프로필이 성공적으로 업데이트되었습니다." });
      setState(prev => ({ ...prev, profile: profileUpdateResponse.data, avatarFile: null }));
    } else {
      toast({ title: "오류", description: profileUpdateResponse.error.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    const newErrors: PasswordErrors = {};
    const { currentPassword, newPassword, confirmPassword } = state.security;
    if (!currentPassword) newErrors.currentPassword = "현재 비밀번호를 입력해주세요.";
    if (!newPassword) {
      newErrors.newPassword = "새 비밀번호를 입력해주세요.";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "비밀번호는 최소 8자 이상이어야 합니다.";
    } else if (!/[!@#$,./?]/.test(newPassword)) {
      newErrors.newPassword = "비밀번호는 특수문자(!@#$,./?)를 포함해야 합니다.";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (newPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = "새 비밀번호와 일치하지 않습니다.";
    }
    
    if (Object.keys(newErrors).length > 0 && (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword)) {
      setPasswordErrors(newErrors);
      return;
    }
    
    setIsSaving(true);
    setPasswordErrors({});
    const payload: ChangePasswordRequest = { currentPassword, newPassword };
    const response = await apiCall('/api/user/profile/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (response.success) {
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.",
      });
      removeToken();

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } else {
      setPasswordErrors({ general: response.error.message });
    }
    setIsSaving(false);
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    setIsSaving(true);
    const endpoint = enabled ? "/api/user/profile/2fa/enable" : "/api/user/profile/2fa/disable";
    const response = await apiCall(endpoint, { 
      method: 'POST' 
    });

    if (response.success) {
      setState(prev => ({ ...prev, security: { ...prev.security, twoFactorEnabled: enabled } }));
      toast({ title: "설정 변경 완료", description: `2단계 인증이 성공적으로 ${enabled ? "활성화" : "비활성화"}되었습니다.` });
    } else {
      toast({ title: "오류", description: response.error.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  if (isFetching) {
    return ( 
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div> );
  }
  if (error) {
    return ( 
    <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] p-4 text-center">
      <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">
          데이터 로드 오류
        </h2>
        <p className="text-muted-foreground mb-4">
          {error}
        </p>
        <Button onClick={fetchUserProfile}>
          다시 시도
        </Button>
    </div>);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4 md:p-6"> {}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">설정</h1>
        <p className="text-muted-foreground">계정 설정 및 환경설정을 관리하세요.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
          <TabsTrigger value="profile">프로필</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
          <TabsTrigger value="notifications">알림</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>아래 정보를 수정하고 저장할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={state.profile.avatarUrl || undefined} alt={state.profile.name} />
                    <AvatarFallback className="text-3xl">
                      {state.profile.name ? (state.profile.name.charAt(0).toUpperCase()) : (<UserIcon className="h-10 w-10 text-muted-foreground" />)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-background border hover:bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  ><Camera className="h-4 w-4" /></Button>
                  <input 
                  type="file" 
                  accept="image/jpeg, image/png" 
                  className="sr-only" 
                  ref={fileInputRef} 
                  onChange={handleAvatarFileChange} 
                  />
                  <span className="sr-only">프로필 사진 변경</span>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-semibold">{state.profile.name || "사용자 이름"}</h3>
                  <p className="text-sm text-muted-foreground">{state.profile.email || "이메일 정보 없음"}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">이름</Label>
                  <Input 
                  id="profile-name" 
                  name="name" 
                  value={state.profile.name} 
                  onChange={handleProfileChange} 
                  disabled={isSaving} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-email">이메일 (변경 불가)</Label>
                  <Input 
                  id="profile-email" 
                  name="email" 
                  type="email" 
                  value={state.profile.email} 
                  readOnly disabled className="cursor-not-allowed bg-muted/50"
                   />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-introduce">자기소개</Label> {}
                <Textarea
                  id="profile-introduce"
                  name="introduce"
                  value={state.profile.introduce}
                  onChange={handleProfileChange}
                  placeholder="자신에 대해 간략히 소개해주세요."
                  rows={4}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isSaving || isFetching}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                프로필 저장
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>계정 보안을 위해 정기적으로 비밀번호를 변경하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <Input 
                id="current-password" 
                name="currentPassword" 
                type="password" 
                value={state.security.currentPassword} 
                onChange={handleSecurityChange} 
                disabled={isSaving}
                />
                 {passwordErrors.currentPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <Input 
                id="new-password"
                name="newPassword" 
                type="password" 
                value={state.security.newPassword} 
                onChange={handleSecurityChange} 
                disabled={isSaving}
                />
                {passwordErrors.newPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input 
                id="confirm-password" 
                name="confirmPassword" 
                type="password" 
                value={state.security.confirmPassword} 
                onChange={handleSecurityChange} 
                disabled={isSaving}
                />
                {passwordErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>}
              </div>
              {passwordErrors.general && <p className="text-sm text-destructive text-center pt-2">{passwordErrors.general}</p>}
            </CardContent>
            <CardFooter>
              <Button onClick={handleChangePassword} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 변경
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2단계 인증 (2FA)</CardTitle>
              <CardDescription>계정 보안을 강화하기 위한 추가 보안 계층을 설정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="two-factor" className="font-medium">2단계 인증 활성화</Label>
                  <p className="text-sm text-muted-foreground">로그인 시 인증 코드가 추가로 요구됩니다.</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={state.security.twoFactorEnabled}
                  onCheckedChange={handleToggleTwoFactor}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}