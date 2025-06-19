"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiCall } from "@/lib/api";

function AcceptInvitationLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "success" | "error" | "requires_login">("loading");
  const [message, setMessage] = useState<string>("초대 정보를 확인 중입니다...");

  const handleAcceptInvitation = useCallback(async (inviteToken: string) => {
    setStatus("loading");
    setMessage("초대를 수락 처리 중입니다...");
    
    const appUserToken = getToken();
    if (!appUserToken) {
        setStatus("requires_login");
        setMessage("초대를 수락하려면 먼저 로그인해야 합니다.");
        return;
    }

    console.log("초대 수락 시도 | 초대 토큰:", inviteToken);

    const response = await apiCall<string>('/api/invitations/accept',
      {
        method: "POST",
        body: JSON.stringify({ token: inviteToken }),
      }
    );

    if(response.success) {
      setStatus("success");
      setMessage(response.data || "프로젝트 초대를 성공적으로 수락했습니다!");
      toast({ 
        title: "성공", 
        description: "프로젝트 초대가 성공적으로 수락되었습니다!" });
    } else {
      setStatus("error");
      setMessage(response.error.message);
      toast({ title: "오류", description: response.error.message || "초대 수락에 실패했습니다.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (!tokenFromUrl) {
      setStatus("error");
      setMessage("유효하지 않은 초대 링크입니다. 토큰이 누락되었습니다.");
      return;
    }

    const appToken = getToken();
    if (!appToken) {
      setStatus("requires_login");
      setMessage("초대를 수락하려면 먼저 로그인해주세요.");
    } else {
      handleAcceptInvitation(tokenFromUrl);
    }
  }, [searchParams, handleAcceptInvitation]);


  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (status === "requires_login") {
    const redirectUrl = `/accept-invitation?token=${searchParams.get('token')}`;
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    
    return (
      <div className="text-center space-y-4">
        <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
        <h2 className="text-xl font-semibold">로그인 필요</h2>
        <p className="text-muted-foreground px-4">{message}</p>
        <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push(loginUrl)}>
                로그인
            </Button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">초대 수락 완료!</h2>
        <p className="text-muted-foreground px-4">{message}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">대시보드로 이동</Link>
        </Button>
      </div>
    );
  }

  if(status === "error"){
    return (
    <div className="text-center space-y-4">
      <XCircle className="mx-auto h-16 w-16 text-destructive" />
      <h2 className="text-xl font-semibold text-destructive">오류 발생</h2>
      <p className="text-muted-foreground px-4">{message}</p>
      <Button variant="outline" asChild className="mt-4">
        <Link href="/dashboard">대시보드로 돌아가기</Link>
      </Button>
    </div>
    );
  }
}

export default function AcceptInvitationPageContainer() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-md py-8">
                <CardContent>
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center min-h-[200px]">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">초대 정보를 확인 중입니다...</p>
                        </div>
                    }>
                        <AcceptInvitationLogic />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}