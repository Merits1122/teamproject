"use client"

import type React from "react"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { setToken } from "@/lib/auth"
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Loader2 } from "lucide-react";

interface LoginResponse {
  token?: string | null; // 2FA가 필요하면 null일 수 있음
  twoFactorRequired?: boolean;
  message?: string;
  username?: string;
  email?: string;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginResponse = (response: LoginResponse, emailFor2FA: string) => {
    const originalRedirectUrl = searchParams.get("redirect");

    if (response.twoFactorRequired) {
        // 2FA가 필요한 경우
        toast({ title: "2단계 인증 필요", description: response.message || "이메일로 전송된 인증 코드를 입력해주세요." });
        // 2FA 페이지로 이동할 경로를 구성합니다.
        let twoFactorPath = `/twofactor?email=${encodeURIComponent(emailFor2FA)}`;
        
        if (originalRedirectUrl) {
          twoFactorPath += `&redirect=${encodeURIComponent(originalRedirectUrl)}`;
        }
        
        router.push(twoFactorPath);
    } else if (response.token) {
        const identifier = response.username || response.email || emailFor2FA;
        setToken(response.token, rememberMe);
        if (identifier && typeof window !== "undefined") {
          if (rememberMe) localStorage.setItem("app_user_identifier", identifier);
          else sessionStorage.setItem("app_user_identifier", identifier);
        }
        
        toast({ title: "성공!", description: "로그인에 성공했습니다." });
        
        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push("/dashboard");
        }
    } else {
        // 예상치 못한 응답
        toast({ title: "오류", description: "알 수 없는 로그인 응답입니다.", variant: "destructive"});
    }
  };

  // 이메일/비밀번호 로그인 핸들러
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({ title: "오류", description: "이메일과 비밀번호를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setIsGoogleLoading(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        }
      );
      
      
      if (response.ok) { // 성공 (2xx 상태 코드)
        // 성공 시에는 응답이 항상 JSON이므로 .json()을 사용합니다.

        const successData: LoginResponse = await response.json();
        console.log("로그인 API 응답 성공:", successData);
        console.log("응답에 포함된 토큰:", successData.token);
        handleLoginResponse(successData, formData.email);
      } else {
        // 실패 (4xx, 5xx 상태 코드)
        // 1. 오류 응답의 본문을 text()로 딱 한 번만 읽어서 변수에 저장합니다.
        const errorMessage = await response.text(); 

        // 2. response.status 값에 따라 원하셨던 분기 처리를 수행합니다.
        if (response.status === 401) {
          // 401 Unauthorized: 비밀번호 틀림
          toast({
            title: "로그인 실패",
            description: errorMessage || "비밀번호를 다시 확인해주세요.",
            variant: "destructive",
          });
        } else if (response.status === 403) {
          // 403 Forbidden: 접근 거부 (여기서는 이메일 미인증)
          toast({
            title: "이메일 인증 필요",
            description: errorMessage || "이메일 인증을 완료해야 로그인할 수 있습니다.",
            variant: "destructive",
          });
        } else {
          // 그 외 다른 모든 오류 (예: 500 서버 오류)
          toast({
            title: "오류 발생",
            description: errorMessage || "알 수 없는 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Login API error:", error);
      toast({ title: "네트워크 또는 서버 오류", description: error.message || "서버와 통신 중 문제가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // 구글 로그인 성공 시 콜백
  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    setIsGoogleLoading(true);
    setIsLoading(false); // 다른 로그인 시도 시 일반 로딩 상태 해제
    const googleIdToken = credentialResponse.credential;

    if (!googleIdToken) {
      toast({ title: "구글 로그인 오류", description: "구글 ID 토큰을 가져오지 못했습니다.", variant: "destructive" });
      setIsGoogleLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/auth/google/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: googleIdToken }),
        }
      );

      const data: LoginResponse = await response.json();
      if (response.ok) {
        // 🔽 구글 로그인 시에는 백엔드 응답의 email이 필요
        const emailFor2FARedirect = data.email || ""; 
        handleLoginResponse(data, emailFor2FARedirect);
      } else {
        let errorMessage = "구글 계정으로 로그인할 수 없습니다.";
        if (data && data.message) {
            errorMessage = data.message;
        }
        toast({ title: "구글 로그인 실패", description: errorMessage, variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Google Login API error:", error);
      toast({ title: "오류", description: error.message || "서버와 통신 중 문제가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    console.error("Google Login Failed (onError callback from GoogleLogin component)");
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
                <Link href="/forgot-password" // 비밀번호 찾기 페이지 경로
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
                    width={"300px"} // Card의 max-w-md는 384px. 패딩 고려하여 적절히 조절
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