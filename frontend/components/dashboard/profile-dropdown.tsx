"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut, UserCircle2, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { getToken } from "@/lib/auth"

interface UserProfileInfo { 
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;

}

interface ProfileDropdownProps {
  onLogout: () => void;
}

export function ProfileDropdown({ onLogout }: ProfileDropdownProps) {
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const token = getToken();
      // 로컬 스토리지나 세션 스토리지에서 사용자 식별자(이름 또는 이메일)를 가져옵니다.
      // 로그인 시 'app_user_identifier' 키로 저장했다고 가정합니다.
      const userIdentifier = typeof window !== "undefined" 
        ? localStorage.getItem("app_user_identifier") || sessionStorage.getItem("app_user_identifier") 
        : null;

      if (!token) {
        setIsLoading(false);
        // 로그인하지 않은 상태에서는 드롭다운이 보이지 않거나 다른 UI를 표시할 수 있음
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/user/profile`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
          // API 호출 실패 시, 로컬에 저장된 이름/이메일이라도 사용하거나 기본값 설정
          console.error("Failed to fetch profile for dropdown");
          setUserProfile({ name: userIdentifier || "사용자", email: userIdentifier, avatarUrl: null });
          return;
        }
        const data: UserProfileInfo = await response.json();
        setUserProfile({
            name: data.name || userIdentifier, // API 응답에 이름이 없으면 로컬 식별자 사용
            email: data.email || (userIdentifier?.includes('@') ? userIdentifier : null), // 이메일 우선
            avatarUrl: data.avatarUrl
        });
      } catch (error) {
        console.error("Error fetching profile for dropdown:", error);
        setUserProfile({ name: userIdentifier || "사용자", email: userIdentifier, avatarUrl: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getInitial = (name?: string | null): string => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={userProfile?.avatarUrl || undefined}
              alt={userProfile?.name || "사용자 프로필"} 
            />
            <AvatarFallback>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
               userProfile?.name ? getInitial(userProfile.name) : <UserCircle2 className="h-5 w-5" />
              }
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile?.name || "사용자"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile?.email || "이메일 정보 없음"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile" className="flex w-full cursor-pointer items-center">
              <User className="mr-2 h-4 w-4" />
              <span>프로필</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex w-full cursor-pointer items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>설정</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}