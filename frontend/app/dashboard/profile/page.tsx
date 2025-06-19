"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, ServerCrash, User as UserIcon } from "lucide-react";
import { apiCall } from "@/lib/api";

interface UserProfile {
  name: string;
  email: string;
  introduce: string;
  avatarUrl?: string | null;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    introduce: "",
    avatarUrl: null,
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserProfile = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    
    const response = await apiCall<UserProfile>('/api/user/profile');

    if (response.success) {
      setProfile(response.data);
    } else {
      setError("프로필 정보를 가져오는데 실패했습니다.");
      toast({ title: "오류", description: response.error.message, variant: "destructive" });
    }
    setIsFetching(false);
  }, [toast]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "파일 형식 오류", description: "이미지 파일(JPG, PNG 등)만 업로드할 수 있습니다.", variant: "destructive"});
      return;
    }
    
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    let finalAvatarUrl = profile.avatarUrl;

    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatarFile", avatarFile);

      const avatarResponse = await apiCall<{ avatarUrl: string }>('/api/user/profile/avatar', {
        method: "POST",
        body: formData,
      });

      if (!avatarResponse.success) {
        toast({ title: "아바타 업로드 오류", description: avatarResponse.error.message, variant: "destructive" });
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = avatarResponse.data.avatarUrl;
      setAvatarFile(null);
    }

    const profileUpdatePayload = {
      name: profile.name,
      introduce: profile.introduce,
      avatarUrl: finalAvatarUrl,
    };

    const profileUpdateResponse = await apiCall('/api/user/profile', {
      method: "PUT",
      body: JSON.stringify(profileUpdatePayload),
    });

    if (profileUpdateResponse.success) {
      toast({ title: "프로필 업데이트 완료", description: "변경사항이 성공적으로 저장되었습니다." });
      setProfile(profileUpdateResponse.data);
    } else {
      toast({ title: "프로필 업데이트 오류", description: profileUpdateResponse.error.message, variant: "destructive" });
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
            <Button onClick={() => window.location.reload()}>
              페이지 새로고침
            </Button>
      </div>);
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
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name || "사용자"} />
                <AvatarFallback className="text-3xl">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : <UserIcon className="h-10 w-10 text-muted-foreground" />}
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
              <h3 className="text-xl font-semibold">{profile.name || "사용자 이름"}</h3>
              <p className="text-sm text-muted-foreground">{profile.email || "이메일 정보 없음"}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">이름</Label>
              <Input 
              id="profile-name" 
              name="name" 
              value={profile.name} 
              onChange={handleInputChange} 
              disabled={isSaving} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">이메일 (변경 불가)</Label>
              <Input 
              id="profile-email" 
              name="email"
              type="email" 
              value={profile.email} 
              readOnly disabled className="cursor-not-allowed bg-muted/50" 
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-introduce">자기소개</Label>
            <Textarea
              id="profile-introduce"
              name="introduce"
              value={profile.introduce}
              onChange={handleInputChange}
              placeholder="자신에 대해 간략히 소개해주세요."
              rows={4}
              disabled={isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            변경사항 저장
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}