"use client"

import type React from "react"
import { Suspense, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { setToken } from "@/lib/auth"
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Loader2 } from "lucide-react";
import { apiCall } from "@/lib/api"

interface LoginResponse {
  token?: string | null;
  twoFactorRequired?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const errorType = searchParams.get('error');
    if (errorType) {
      let description = "다시 로그인해주세요.";
      if (errorType === 'session_expired') {
        description = "세션이 만료되었습니다. 다시 로그인해주세요.";
      } else if (errorType === 'auth_required') {
        description = "해당 페이지에 접근하려면 로그인이 필요합니다.";
      }
      
      toast({
        title: "로그인 필요",
        description: description,
        variant: "destructive",
      });

      const newPath = window.location.pathname;
      router.replace(newPath, { scroll: false });
    }
  }, [searchParams, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  

  const handleLoginSuccess = useCallback((response: LoginResponse) => {
    const originalRedirectUrl = searchParams.get("redirect");

    if (response.twoFactorRequired) {
      const twoFactorPath = `/twofactor?email=${encodeURIComponent(response.user.email)}`;
      router.push(originalRedirectUrl ? `${twoFactorPath}&redirect=${encodeURIComponent(originalRedirectUrl)}` : twoFactorPath);
    } else if (response.token) {
      setToken(response.token, rememberMe);
      
      localStorage.setItem("app_user_identifier", response.user.email);
      localStorage.setItem("app_user_id", response.user.id.toString());
      
      router.push(originalRedirectUrl || "/dashboard");
    }
  }, [searchParams, rememberMe, router]);

   const handleEmailPasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({ title: "오류", description: "이메일과 비밀번호를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const response = await apiCall<LoginResponse>('/api/auth/login', {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (response.success) {
      handleLoginSuccess(response.data);
    } else {
      const { status, message } = response.error;
      const title = (status === 401 || status === 403) ? "로그인 실패" : "오류 발생";
      toast({ title, description: message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [formData, toast, handleLoginSuccess]);

  const handleGoogleLoginSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
    setIsGoogleLoading(true);
    const googleIdToken = credentialResponse.credential;

    if (!googleIdToken) {
      toast({ title: "구글 로그인 오류", description: "구글 ID 토큰을 가져오지 못했습니다.", variant: "destructive" });
      setIsGoogleLoading(false);
      return;
    }

    const response = await apiCall<LoginResponse>('/api/auth/google/login', {
      method: 'POST',
      body: JSON.stringify({ idToken: googleIdToken })
    });

    if (response.success) {
      handleLoginSuccess(response.data);
    } else {
      toast({ title: "구글 로그인 실패", description: response.error.message, variant: "destructive" });
    }
    setIsGoogleLoading(false);
  }, [toast, handleLoginSuccess]);

  const handleGoogleLoginError = () => {
    console.error("구글 로그인 실패");
    toast({ title: "구글 로그인 실패", description: "구글 로그인 과정에서 라이브러리 또는 네트워크 오류가 발생했습니다.", variant: "destructive" });
    setIsGoogleLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">로그인</CardTitle>
          <CardDescription>계정에 로그인하여 프로젝트를 관리하세요.</CardDescription>
        </CardHeader>
        <form onSubmit={handleEmailPasswordSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder=""
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading || isGoogleLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder=""
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading || isGoogleLoading}
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading || isGoogleLoading}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                로그인 상태 유지
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
            
            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">또는</span>
              </div>
            </div>

            <div className="w-full flex justify-center">
              {isGoogleLoading ? (
                 <Button variant="outline" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    잠시만 기다려주세요...
                 </Button>
              ) : (
                <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={handleGoogleLoginError}
                    useOneTap={false}
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    logo_alignment="center"
                    text="continue_with"
                    width={"300px"}
                />
              )}
            </div>
            
            <div className="text-center text-sm mt-2">
              계정이 없으신가요?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                회원가입
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={<div className="w-full max-w-md p-8 text-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}