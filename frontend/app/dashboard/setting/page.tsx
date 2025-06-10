"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/notifications/notification-settings"; // 경로 확인
import { Camera, Loader2, ServerCrash, User as UserIcon } from "lucide-react";
import { getToken } from "@/lib/auth"; // auth.ts 경로 확인

// --- 타입 정의 시작 ---
interface UserProfileData {
  name: string;
  email: string;
  introduce: string; // bio -> introduce로 변경
  avatarUrl?: string | null;
}

// 백엔드 API 응답 타입 (예시)
interface UserApiResponse {
  id?: number | string;
  username?: string;
  name: string;
  email: string;
  introduce: string; // bio -> introduce로 변경
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}

interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// --- 타입 정의 끝 ---

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<UserProfileData>({
    name: "",
    email: "",
    introduce: "", // bio -> introduce
    avatarUrl: null,
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
  });

  
  // 초기 데이터 로드
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsProfileLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { /* ... 인증 오류 처리 ... */ setIsProfileLoading(false); setError("로그인이 필요합니다."); return; }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) { /* ... 에러 처리 ... */ throw new Error("프로필 정보 로드 실패"); }
        const userData: UserApiResponse = await response.json();
        setProfileData({
          name: userData.name || "",
          email: userData.email || "",
          introduce: userData.introduce || "", // bio -> introduce
          avatarUrl: userData.avatarUrl || null,
        });
        setSecurityData(prev => ({ ...prev, twoFactorEnabled: userData.twoFactorEnabled || false }));
        setAvatarPreview(userData.avatarUrl || null);
      } catch (err: any) { /* ... 에러 처리 ... */ setError(err.message); }
      finally { setIsProfileLoading(false); }
    };
    fetchUserProfile();
  }, []);

  const handleProfileInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (이전 답변과 동일한 아바타 파일 변경 로직)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setAvatarPreview(reader.result as string); };
        reader.readAsDataURL(file);
      } else { toast({ title: "파일 형식 오류", description: "JPG 또는 PNG 파일만 업로드할 수 있습니다.", variant: "destructive"}); if(fileInputRef.current) fileInputRef.current.value = ""; }
    }
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleTwoFactor = async (checked: boolean) => {
    setIsLoading(true);
    const token = getToken();
    if (!token) { /* ... */ setIsLoading(false); return; }

    const endpoint = checked ? "/api/user/profile/2fa/enable" : "/api/user/profile/2fa/disable";
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${endpoint}`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `2단계 인증 설정 변경에 실패했습니다.`);
      }
      setSecurityData((prev) => ({ ...prev, twoFactorEnabled: checked }));
      toast({ title: "설정 변경 완료", description: `2단계 인증이 성공적으로 ${checked ? "활성화" : "비활성화"}되었습니다.` });
    } catch (error: any) {
      toast({ title: "오류", description: error.message, variant: "destructive" });
      setSecurityData((prev) => ({ ...prev, twoFactorEnabled: !checked })); // 실패 시 스위치 원상복구
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setError(null);
    const token = getToken();
    if (!token) { /* ... */ setIsLoading(false); return; }

    let newAvatarUrl = profileData.avatarUrl;

    if (avatarFile) { // 새 아바타 파일 업로드
      const formDataPayload = new FormData();
      formDataPayload.append("avatarFile", avatarFile);
      try {
        const avatarResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile/avatar`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formDataPayload }
        );
        if (!avatarResponse.ok) { const errData = await avatarResponse.json().catch(() => ({})); throw new Error(errData.message || "아바타 업로드 실패"); }
        const avatarResult = await avatarResponse.json();
        newAvatarUrl = avatarResult.avatarUrl;
        setAvatarFile(null);
      } catch (error: any) { /* ... 아바타 업로드 오류 처리 ... */ setIsLoading(false); return; }
    }

    const profileUpdatePayload = { // bio -> introduce
      name: profileData.name,
      introduce: profileData.introduce, // ⬅️ 변경
      avatarUrl: newAvatarUrl,
    };

    try {
      const profileUpdateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile`,
        { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`}, body: JSON.stringify(profileUpdatePayload)}
      );
      if (!profileUpdateResponse.ok) { const errData = await profileUpdateResponse.json().catch(() => ({})); throw new Error(errData.message || "프로필 정보 업데이트 실패");}
      
      const updatedUserData: UserApiResponse = await profileUpdateResponse.json();
      setProfileData({
          name: updatedUserData.name || "",
          email: profileData.email, 
          introduce: updatedUserData.introduce || "", // ⬅️ 변경
          avatarUrl: updatedUserData.avatarUrl || newAvatarUrl, 
      });
      setAvatarPreview(updatedUserData.avatarUrl || newAvatarUrl || null);
      toast({ title: "프로필 업데이트 완료", description: "변경사항이 성공적으로 저장되었습니다."});
    } catch (error: any) { /* ... 프로필 업데이트 오류 처리 ... */ }
    finally { setIsLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword) { /* ... */ return; }
    if (securityData.newPassword !== securityData.confirmPassword) { /* ... */ return; }
    if (securityData.newPassword.length < 8) { toast({title: "오류", description: "새 비밀번호는 8자 이상이어야 합니다.", variant: "destructive"}); return; }
    if (securityData.newPassword.length < 8) { toast({title: "오류", description: "새 비밀번호는 8자 이상이어야 합니다.", variant: "destructive"}); return; }
    if (!/[!@#$,./?]/.test(securityData.newPassword)) { toast({ title: "오류", description: "!@#$,./와 같은 특수문자를 포함해야 합니다.", variant: "destructive" }); return; }
    setIsLoading(true);
    setError(null);
    const token = getToken();
    if (!token) { /* ... */ setIsLoading(false); return; }

    const payload: ChangePasswordRequest = { // ⬅️ DTO 타입 사용
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword,
    };

    try {
      // 🔽 비밀번호 변경을 위한 새 API 엔드포인트 사용
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/user/profile/password`, {
        method: 'PUT', // 또는 POST, 백엔드 구현에 따라
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "비밀번호 변경에 실패했습니다.");
      }

      toast({ title: "성공", description: "비밀번호가 성공적으로 변경되었습니다." });
      setSecurityData({ currentPassword: "", newPassword: "", confirmPassword: "", twoFactorEnabled: securityData.twoFactorEnabled });
    } catch (error: any) {
      setError(error.message);
      toast({ title: "오류 발생", description: error.message || "비밀번호 변경 중 문제가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isProfileLoading) { /* ... 로딩 UI ... */ }
  if (error && !profileData.email && !isProfileLoading) { /* ... 초기 로드 에러 UI ... */ }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-4 md:p-6"> {/* 전체 페이지 패딩 추가 */}
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
                    <AvatarImage src={avatarPreview || profileData.avatarUrl || undefined} alt={profileData.name || "사용자"} />
                    <AvatarFallback className="text-3xl">
                      {profileData.name ? (profileData.name.charAt(0).toUpperCase()) : (<UserIcon className="h-10 w-10 text-muted-foreground" />)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon" variant="outline"
                    className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-background border hover:bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  ><Camera className="h-4 w-4" /></Button>
                  <input type="file" accept="image/jpeg, image/png" className="sr-only" ref={fileInputRef} onChange={handleAvatarFileChange} />
                  <span className="sr-only">프로필 사진 변경</span>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-semibold">{profileData.name || "사용자 이름"}</h3>
                  <p className="text-sm text-muted-foreground">{profileData.email || "이메일 정보 없음"}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">이름</Label>
                  <Input id="profile-name" name="name" value={profileData.name} onChange={handleProfileInputChange} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-email">이메일 (변경 불가)</Label>
                  <Input id="profile-email" name="email" type="email" value={profileData.email} readOnly disabled className="cursor-not-allowed bg-muted/50" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-introduce">자기소개</Label> {/* bio -> introduce */}
                <Textarea
                  id="profile-introduce" // bio -> introduce
                  name="introduce"      // bio -> introduce
                  value={profileData.introduce} // bio -> introduce
                  onChange={handleProfileInputChange}
                  placeholder="자신에 대해 간략히 소개해주세요."
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isLoading || isProfileLoading}>
                {(isLoading || isProfileLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                <Input id="current-password" name="currentPassword" type="password" value={securityData.currentPassword} onChange={handleSecurityChange} autoComplete="current-password"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <Input id="new-password" name="newPassword" type="password" value={securityData.newPassword} onChange={handleSecurityChange} autoComplete="new-password"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input id="confirm-password" name="confirmPassword" type="password" value={securityData.confirmPassword} onChange={handleSecurityChange} autoComplete="new-password"/>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleChangePassword} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  checked={securityData.twoFactorEnabled}
                  onCheckedChange={handleToggleTwoFactor} // ⬅️ 핸들러 연결
                  disabled={isLoading}
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