"use client"

import type React from "react" // React 타입 임포트 추가
import { useState } from "react"
import Link from "next/link"
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
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react" // 로딩 아이콘 추가

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({
        title: "오류",
        description: "이메일 주소를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // 🔽 실제 API 호출로 변경
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email }),
        }
      );

      if (response.ok) {
        setSubmitted(true) // 성공 시 submitted 상태 변경
        toast({
          title: "재설정 링크 전송됨",
          description: `만약 ${email} 주소가 시스템에 등록되어 있다면, 비밀번호 재설정 링크가 전송됩니다. 이메일을 확인해주세요.`,
        });
      } else {
        // 서버에서 구체적인 오류 메시지를 보냈을 경우를 대비
        let errorMessage = "재설정 링크 전송 중 문제가 발생했습니다. 다시 시도해주세요.";
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // JSON 파싱 실패 시 기본 메시지 사용
            console.error("Could not parse error response as JSON for forgot password", e);
        }
        toast({
          title: "오류",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast({
        title: "네트워크 또는 서버 오류",
        description: error.message || "재설정 링크 전송 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center"> {/* text-center 추가 */}
          <CardTitle className="text-2xl font-bold">비밀번호 재설정</CardTitle>
          {!submitted && ( // submitted가 false일 때만 설명 표시
            <CardDescription>이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다</CardDescription>
          )}
        </CardHeader>
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  name="email" // name 속성 추가 (폼 요소 식별용)
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
        ) : (
          <CardContent className="space-y-6 py-8 text-center"> {/* 간격 및 정렬 조정 */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">이메일 발송 완료!</h3>
                <p className="text-sm text-muted-foreground px-4">
                <strong>{email}</strong> 주소로 비밀번호 재설정 링크를 보냈습니다. <br />
                메일함을 확인해주세요. (스팸 메일함도 확인해보세요)
                </p>
            </div>
            <Button variant="outline" asChild className="mt-6">
              <Link href="/login">
                로그인으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}