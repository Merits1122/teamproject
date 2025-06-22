"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiCall } from "@/lib/api";


function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting] = useState(false);
  const [error, setError] = useState({
    newPassword: "",
    confirmPassword: "",
    general: ""
  });
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    token: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setFormData(prev => ({ ...prev, token: tokenFromUrl }));
    } else {
      setError(prev => ({...prev, general: "유효하지 않은 접근입니다. 비밀번호 재설정 링크를 다시 확인해주세요."}));
    }
  setIsLoading(false);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error[name as keyof typeof error]) {
      setError(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = useCallback(() => {
    const newErrors = { newPassword: "", confirmPassword: "", general: "" };
    let isValid = true;
    
    if (!formData.newPassword) {
        newErrors.newPassword = "새 비밀번호를 입력해주세요.";
        isValid = false;
    } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = "비밀번호는 최소 8자 이상이어야 합니다.";
        isValid = false;
    } else if (!/[!@#$,./?]/.test(formData.newPassword)) {
        newErrors.newPassword = "비밀번호는 특수문자(!@#$,./?)를 포함해야 합니다.";
        isValid = false;
    }

    if (!formData.confirmPassword) {
        newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
        isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
        isValid = false;
    }
        
    setError(newErrors);
    return isValid;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !formData.token) {
      if (!formData.token) {
        toast({ 
          title: "오류", 
          description: "재설정 토큰이 유효하지 않습니다.", 
          variant: "destructive" 
        });
      }
      return;
    }

    setIsLoading(true);
    setError({ newPassword: "", confirmPassword: "", general: "" });

    const response = await apiCall('/api/auth/reset-password', {
      method: "POST",
      body: JSON.stringify({ 
        token: formData.token, 
        newPassword: formData.newPassword
      }),
    });

    if (response.success) {
      setSuccess(true);
      toast({
        title: "성공",
        description: "비밀번호가 성공적으로 변경되었습니다. 이제 새 비밀번호로 로그인해주세요.",
      });
    } else {
      console.error("비밀번호 재설정 실패:", response.error);
      setError(prev => ({ ...prev, general: response.error.message }));
      toast({ 
        title: "오류", 
        description: response.error.message, 
        variant: "destructive" 
      });
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center">
    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
    <p className="mt-2">확인 중...</p>
    </div>
  }

  if (error && !formData.token && !success) {
    return (
      <div className="text-center p-8">  
        <p className="text-destructive">{error.general}</p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="link">로그인 페이지로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <svg className="mx-auto h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold">비밀번호 변경 완료!</h2>
        <p className="text-muted-foreground">이제 새 비밀번호로 로그인할 수 있습니다.</p>
        <Link href="/login">
          <Button className="mt-4">로그인 페이지로 이동</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">새 비밀번호</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            disabled={isSubmitting || !formData.token}
          />
          {error.newPassword && <p className="text-sm text-destructive mt-1">{error.newPassword}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting || !formData.token}
          />
          {error.confirmPassword && <p className="text-sm text-destructive mt-1">{error.confirmPassword}</p>}
        </div>
        {error.general && <p className="text-sm text-destructive text-center pt-2">{error.general}</p>}
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button type="submit" className="w-full" disabled={isSubmitting || !formData.token}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "비밀번호 변경 중..." : "비밀번호 변경"}
        </Button>
      </CardFooter>
    </form>
  );
}


export default function ResetPasswordPageContainer() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">새 비밀번호 설정</CardTitle>
        </CardHeader>
        <Suspense fallback={
          <div className="p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> 
            <p className="mt-2 text-muted-foreground">
              링크 정보 확인 중...
            </p>
          </div>
        }>
        <ResetPasswordForm />
        </Suspense>
        <CardFooter className="flex justify-center mt-4">
          <Link href="/login" className="text-sm text-primary hover:underline">
            로그인으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}