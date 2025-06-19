"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { apiCall } from "@/lib/api"

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({
        title: "오류",
        description: "이메일 주소를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true)
    console.log("비밀번호 재설정 요청 | 이메일:", email);
    
    const response = await apiCall<string>('/api/auth/forgot-password', {
        method: "POST",
        body: JSON.stringify({ email: email }),
      });

    if (response.success) {
      setSubmitted(true);
      toast({
        title: "재설정 메일 전송 완료",
        description: `${email} 주소로 메일을 전송하였습니다. 메일을 확인해주세요`,
      });
    } else {
      console.error("비밀번호 재설정 요청 실패:", response.error);
      toast({
        title: "오류",
        description: response.error.message || "요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
    
  if (submitted) {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">이메일을 확인해주세요</CardTitle>
                    <CardDescription>요청이 성공적으로 접수되었습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        입력하신 이메일 주소 <strong className="text-primary">{email}</strong>(으)로<br/>
                        비밀번호 재설정 링크를 보냈습니다.
                    </p>
                    <p className="text-xs text-muted-foreground">(스팸 메일함도 확인해보세요.)</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/login">로그인으로 돌아가기</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">비밀번호 재설정</CardTitle>
            <CardDescription>이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="example@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "재설정 링크 전송 중..." : "재설정 링크 전송"}
            </Button>
            <div className="text-center text-sm">
               비밀번호가 기억나셨나요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}