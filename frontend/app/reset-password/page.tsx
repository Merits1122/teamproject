"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// URLSearchParams를 읽기 위한 Suspense Wrapper (필수)
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 클라이언트 컴포넌트에서 URL 파라미터 읽기
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("유효하지 않은 접근입니다. 비밀번호 재설정 토큰이 URL에 없습니다.");
      toast({
        title: "오류",
        description: "유효하지 않은 재설정 링크입니다.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // 이전 에러 메시지 초기화

    if (!newPassword || !confirmPassword) {
      toast({ title: "입력 오류", description: "새 비밀번호와 확인 비밀번호를 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "입력 오류", description: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) { // 백엔드 정책과 일치하는지 확인
        toast({ title: "입력 오류", description: "비밀번호는 최소 8자 이상이어야 합니다.", variant: "destructive" });
        return;
    }
    if (!token) {
      toast({ title: "오류", description: "재설정 토큰이 유효하지 않습니다.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token, newPassword: newPassword }),
        }
      );

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "성공",
          description: "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.",
        });
        // router.push("/login"); // 몇 초 후 로그인 페이지로 리다이렉트 가능
      } else {
        let errorMessage = "비밀번호 변경에 실패했습니다.";
        try {
            const errorData = await response.json();
            if (errorData) { // 백엔드가 문자열만 보냈을 경우 errorData가 문자열일 수 있음
                errorMessage = typeof errorData === 'string' ? errorData : errorData.message || errorMessage;
            }
        } catch (e) {
            const textError = await response.text().catch(() => null);
            if(textError) errorMessage = textError;
        }
        setError(errorMessage);
        toast({ title: "오류", description: errorMessage, variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "비밀번호 변경 중 오류가 발생했습니다.");
      toast({ title: "네트워크 또는 서버 오류", description: "서버와 통신 중 문제가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !token && !success) { // 토큰이 아예 없는 초기 에러
    return (
        <div className="text-center p-8">
            <p className="text-destructive">{error}</p>
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
            type="password"
            placeholder="********"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading || !token}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading || !token}
          />
        </div>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button type="submit" className="w-full" disabled={isLoading || !token}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "비밀번호 변경 중..." : "비밀번호 변경"}
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
                    <CardDescription>
                        URL의 토큰이 유효한 경우 새 비밀번호를 설정할 수 있습니다.
                    </CardDescription>
                </CardHeader>
                {/* Suspense로 감싸서 useSearchParams가 클라이언트에서 준비될 때까지 기다림 */}
                <Suspense fallback={<div className="p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> <p className="mt-2 text-muted-foreground">링크 정보 확인 중...</p></div>}>
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