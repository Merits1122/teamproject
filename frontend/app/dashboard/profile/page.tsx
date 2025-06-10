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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, ServerCrash, User as UserIcon } from "lucide-react"; // UserIcon 추가
import { getToken } from "@/lib/auth";

// --- 타입 정의 시작 ---
interface UserProfileData {
  name: string;
  email: string;
  introduce: string;
  avatarUrl?: string | null;
}

interface UserApiResponse {
  id?: number | string;
  username?: string;
  name: string;
  email: string;
  introduce: string;
  avatarUrl?: string | null;
}
// --- 타입 정의 끝 ---

export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<UserProfileData>({
    name: "",
    email: "",
    introduce: "",
    avatarUrl: null,
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsFetchingProfile(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError("프로필 정보를 불러오려면 로그인이 필요합니다.");
        toast({ title: "인증 오류", description: "로그인이 필요합니다.", variant: "destructive" });
        setIsFetchingProfile(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const errorData = await response.json().catch(()=> ({message: "사용자 정보를 가져오지 못했습니다."}));
          throw new Error(errorData.message || `프로필 정보 로드 실패 (상태: ${response.status})`);
        }
        const userData: UserApiResponse = await response.json();
        const currentProfile = {
          name: userData.name || "",
          email: userData.email || "",
          introduce: userData.introduce || "",
          avatarUrl: userData.avatarUrl || null,
        };
        setProfileData(currentProfile);
        setAvatarPreview(userData.avatarUrl || null);
      } catch (err: any) {
        console.error("Failed to fetch user profile:", err);
        setError(err.message);
        toast({ title: "오류", description: err.message, variant: "destructive" });
      } finally {
        setIsFetchingProfile(false);
      }
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected avatar file:", file);
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
          console.log("Avatar preview Data URL set.");
        };
        reader.readAsDataURL(file);
      } else {
        toast({ title: "파일 형식 오류", description: "JPG 또는 PNG 파일만 업로드할 수 있습니다.", variant: "destructive"});
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = async () => {
  setIsLoading(true);
  setError(null);
  const token = getToken();
  if (!token) { /* ... */ return; }

  let newAvatarUrlFromServer = profileData.avatarUrl; // 기존 아바타 URL로 초기화

  // 1. 새 아바타 파일이 있으면 먼저 업로드
  if (avatarFile) {
    const formDataPayload = new FormData();
    formDataPayload.append("avatarFile", avatarFile);
    console.log("Attempting to upload avatar:", avatarFile.name); // ⬅️ 로그

    try {
      const avatarResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile/avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataPayload,
        }
      );
      console.log("Avatar upload response status:", avatarResponse.status); // ⬅️ 로그

      if (!avatarResponse.ok) {
        const errorData = await avatarResponse.json().catch(() => ({ message: "아바타 업로드 응답 파싱 실패" }));
        console.error("Avatar upload API error data:", errorData); // ⬅️ 로그
        throw new Error(errorData.message || "아바타 업로드에 실패했습니다.");
      }
      const avatarResult = await avatarResponse.json();
      console.log("Avatar upload API success result:", avatarResult); // ⬅️ 로그
      newAvatarUrlFromServer = avatarResult.avatarUrl; // 업로드 성공 시 새 URL로 교체
      setAvatarFile(null);
    } catch (error: any) {
      console.error("Avatar upload catch error:", error); // ⬅️ 로그
      toast({ title: "아바타 업로드 오류", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }
  }

  // 2. 텍스트 프로필 정보 업데이트
  const profileUpdatePayload = {
    name: profileData.name,
    introduce: profileData.introduce,
    avatarUrl: newAvatarUrlFromServer, // ⬅️ 아바타가 변경되었으면 새 URL, 아니면 기존 URL
  };
  console.log("Attempting to update profile with payload:", profileUpdatePayload); // ⬅️ 로그

  try {
    const profileUpdateResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/user/profile`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`},
        body: JSON.stringify(profileUpdatePayload),
      }
    );
    console.log("Profile update response status:", profileUpdateResponse.status); // ⬅️ 로그

    if (!profileUpdateResponse.ok) {
      const errorData = await profileUpdateResponse.json().catch(() => ({ message: "프로필 정보 업데이트 응답 파싱 실패" }));
      console.error("Profile update API error data:", errorData); // ⬅️ 로그
      throw new Error(errorData.message || "프로필 정보 업데이트에 실패했습니다.");
    }

    const updatedUserData: UserApiResponse = await profileUpdateResponse.json();
    console.log("Profile update API success result:", updatedUserData); // ⬅️ 로그

    const updatedProfile = {
        name: updatedUserData.name || "",
        email: profileData.email, 
        introduce: updatedUserData.introduce || "",
        avatarUrl: updatedUserData.avatarUrl || newAvatarUrlFromServer, 
    };
    setProfileData(updatedProfile);
    setAvatarPreview(updatedProfile.avatarUrl || null);
    console.log("Frontend profileData and avatarPreview updated."); // ⬅️ 로그

    toast({ title: "프로필 업데이트 완료", description: "변경사항이 성공적으로 저장되었습니다."});
  } catch (error: any) {
    console.error("Profile update catch error:", error); // ⬅️ 로그
    toast({ title: "프로필 업데이트 오류", description: error.message, variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
};

  if (isFetchingProfile) {
    return ( <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> );
  }

  if (error && !profileData.email) {
    return ( <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] p-4 text-center"><ServerCrash className="w-16 h-16 text-destructive mb-4" /><h2 className="text-xl font-semibold text-destructive mb-2">데이터 로드 오류</h2><p className="text-muted-foreground mb-4">{error}</p><Button onClick={() => window.location.reload()}>페이지 새로고침</Button></div>);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">내 프로필</h1>
        <p className="text-muted-foreground">개인 정보를 관리하고 업데이트하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>프로필 정보</CardTitle>
          <CardDescription>아래 정보를 수정하고 저장할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                {/* 🔽 AvatarImage src 수정: 미리보기 또는 저장된 URL만 사용, 없으면 Fallback이 표시됨 */}
                <AvatarImage src={avatarPreview || profileData.avatarUrl || undefined} alt={profileData.name || "사용자"} />
                <AvatarFallback className="text-3xl"> {/* 폰트 크기 조절 예시 */}
                  {/* 🔽 이름의 첫 글자를 대문자로 표시, 이름 없으면 UserIcon 표시 */}
                  {profileData.name ? (
                    profileData.name.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-background border hover:bg-muted flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
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
            <Label htmlFor="profile-introduce">자기소개</Label>
            <Textarea
              id="profile-introduce"
              name="introduce"
              value={profileData.introduce}
              onChange={handleProfileInputChange}
              placeholder="자신에 대해 간략히 소개해주세요."
              rows={4}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={isLoading || isFetchingProfile}>
            {(isLoading || isFetchingProfile) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            변경사항 저장
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}