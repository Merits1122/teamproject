"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { apiCall } from "@/lib/api";

function VerifyEmailLogic() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("이메일을 인증하는 중입니다...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("유효하지 않은 인증 링크입니다.");
      return;
    }

    const verifyEmail = async () => {
      const response = await apiCall<string>(`/api/auth/verify-email?token=${token}`);
      if (response.success) {
        setStatus("success");
        setMessage(response.data);
      } else {
        console.error("이메일 인증 API 호출 실패:", response.error);
        setStatus("error");
        setMessage(response.error.message);
      }
    }; verifyEmail();
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case "verifying":
        return (<>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{message}</p>
        </>);
      case "success":
        return (<>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-xl font-semibold">인증 완료!</h2>
          <p className="text-muted-foreground px-4">{message}</p>
          <Button asChild className="mt-4">
            <Link href="/login">로그인 페이지로 이동</Link>
           </Button>
        </>);
      case "error":
        return (<>
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">인증 실패</h2>
          <p className="text-muted-foreground px-4">{message}</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard">대시보드로 돌아가기</Link>
          </Button></>
        );
      }
    };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">이메일 인증</CardTitle>
        <CardDescription>계정 활성화를 위한 마지막 단계입니다.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin" />}>
        <VerifyEmailLogic />
      </Suspense>
      </div>
  );
}