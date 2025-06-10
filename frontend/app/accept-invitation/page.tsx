"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function AcceptInvitationLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "requires_login">("loading");
  const [message, setMessage] = useState<string>("초대 정보를 확인 중입니다...");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setInvitationToken(tokenFromUrl);
      const appToken = getToken();
      if (!appToken) {
        setStatus("requires_login");
        setMessage("초대를 수락하려면 먼저 로그인해주세요. 로그인 후 이 페이지에 다시 접속하거나 초대 링크를 다시 클릭해주세요.");
        setIsLoading(false);
      } else {
        handleAcceptInvitation(tokenFromUrl, appToken);
      }
    } else {
      setStatus("error");
      setMessage("유효하지 않은 초대 링크입니다. 토큰이 누락되었습니다.");
      setIsLoading(false);
      toast({ title: "오류", description: "유효하지 않은 초대 링크입니다.", variant: "destructive" });
    }
  }, [searchParams]);

const handleAcceptInvitation = async (inviteToken: string, appUserToken: string) => {
  setIsLoading(true);
  setMessage("초대를 수락 처리 중입니다...");
  console.log("Attempting to accept invitation. Invite Token:", inviteToken, "App User Token:", appUserToken ? "Present" : "Absent");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/invitations/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${appUserToken}`,
        },
        body: JSON.stringify({ token: inviteToken }),
      }
    );

    console.log("Accept API Response Status:", response.status);
    const responseBodyText = await response.text();
    console.log("Accept API Response Body:", responseBodyText);

    if (response.ok) {
      setStatus("success");
      setMessage(responseBodyText || "프로젝트 초대가 성공적으로 수락되었습니다!");
      toast({ title: "성공", description: responseBodyText || "프로젝트 초대가 성공적으로 수락되었습니다!" });
    } else {
      let parsedErrorMessage = "초대 수락에 실패했습니다.";
      try {
        const errorData = JSON.parse(responseBodyText);
        if (errorData && errorData.message) {
          parsedErrorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          parsedErrorMessage = errorData;
        }
      } catch (e) {
        if (responseBodyText) parsedErrorMessage = responseBodyText;
      }
      setStatus("error");
      setMessage(parsedErrorMessage);
      toast({ title: "오류", description: parsedErrorMessage, variant: "destructive" });
    }
  } catch (err: any) {
    console.error("Accept invitation fetch error:", err);
    setStatus("error");
    setMessage(err.message || "초대 수락 중 네트워크 또는 알 수 없는 오류가 발생했습니다.");
    toast({ title: "네트워크 오류", description: err.message || "서버와 통신 중 문제가 발생했습니다.", variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
};

  if (isLoading && status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (status === "requires_login") {
    const currentPathWithToken = `/accept-invitation?token=${invitationToken}`;
    const loginRedirectUrl = `/login?redirect=${encodeURIComponent(currentPathWithToken)}`;
    const registerRedirectUrl = `/register?redirect=${encodeURIComponent(currentPathWithToken)}`;
    
    return (
      <div className="text-center space-y-4">
        <XCircle className="mx-auto h-16 w-16 text-yellow-500" />
        <h2 className="text-xl font-semibold">로그인 필요</h2>
        <p className="text-muted-foreground px-4">{message}</p>
        <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push(loginRedirectUrl)}>
                로그인
            </Button>
            <Button variant="outline" onClick={() => router.push(registerRedirectUrl)}>
                회원가입
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

  if (status === "error") {
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
            <Card className="w-full max-w-md py-8">1122
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