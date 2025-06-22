"use client"

import type React from "react"

import { Suspense, useCallback, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { apiCall } from "@/lib/api"

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [error, setError] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error[name as keyof typeof error]) {
      setError((prev) => ({ ...prev, [name]: "" }));
    }
  }

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    if (typeof checked === 'boolean') {
        setFormData((prev) => ({ ...prev, terms: checked }));
        if (error.terms) {
          setError((prev) => ({ ...prev, terms: "" }));
        }
    }
  };

  const validateForm = useCallback(() => {
    const newErrors = { name: "", email: "", password: "", confirmPassword: "", terms: "" };
    let isValid = true;
    if (!formData.name.trim()) {
      newErrors.name = "이름을 입력해주세요.";
      isValid = false;
    }
    if (!formData.email.trim()) {
      newErrors.email = "이메일을 입력해주세요.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "유효하지 않은 이메일 형식입니다.";
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요.";
      isValid = false;
    } else {
      if (formData.password.length < 8) {
        newErrors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
        isValid = false;
      } else if (!/[!@#$,./?]/.test(formData.password)) {
        newErrors.password = "비밀번호는 특수문자(!@#$,./?)를 포함해야 합니다.";
        isValid = false;
      }
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
      isValid = false;
    }
    if (!formData.terms) {
      newErrors.terms = "이용약관에 동의해야 합니다.";
      isValid = false;
    }
    setError(newErrors);
    return isValid;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    const response = await apiCall('/api/auth/signup', {
      method: "POST",
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }),
    });

    if (response.success) {
      toast({
        title: "회원가입 신청 완료!",
        description: "이메일을 확인하여 계정 활성화를 완료해주세요. 잠시후 로그인 페이지로 이동합니다.",
      });
      const redirectUrl = searchParams.get("redirect");
      const loginUrl = redirectUrl ? `/login?redirect=${redirectUrl}` : "/login";
      setTimeout(() => { 
        router.push(loginUrl); 
      }, 2000);
    } else {
      console.error("회원가입 실패:", response.error);
      toast({
        title: "회원가입 실패",
        description: response.error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">계정 생성</CardTitle>
          <CardDescription>시작하려면 아래 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
              {error.name && <p className="text-sm text-destructive">{error.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
              {error.email && <p className="text-sm text-destructive">{error.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              {error.password && <p className="text-sm text-destructive">{error.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
              />
              {error.confirmPassword && <p className="text-sm text-destructive">{error.confirmPassword}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={formData.terms} onCheckedChange={handleCheckboxChange} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    이용약관 및 개인정보 처리방침에 동의합니다.
                </Label>
              </div>
            </div>
            {error.terms && <p className="text-sm text-destructive">{error.terms}</p>}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "계정 생성 중..." : "계정 생성"}
            </Button>
            <div className="text-center text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
        <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin" />}>
            <RegisterForm />
        </Suspense>
    </div>
  );
}
