"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getToken, removeToken } from "@/lib/auth";
import { Loader2, CheckCircle, XCircle, MailWarning, UserCheck, LogOut, LogIn } from "lucide-react";
import { apiCall } from "@/lib/api";
import { ApiInvitationDetails } from "@/lib/types";

function AcceptInvitationLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "prompt" | "success" | "error" | "wrong_user" | "requires_login">("loading");
  const [invitationDetails, setInvitationDetails] = useState<ApiInvitationDetails | null>(null);
  const [message, setMessage] = useState("초대 정보를 확인 중입니다...");
  const inviteToken = searchParams.get("token");

  useEffect(() => {
    if (!inviteToken) {
      setStatus("error");
      setMessage("유효하지 않은 초대 링크입니다.");
      return;
    }
    
    const fetchDetails = async () => {
      const res = await apiCall<ApiInvitationDetails>(`/api/invitations/details?token=${inviteToken}`);
      if(res.success) {
        const details = res.data;
        setInvitationDetails(details);
        const appToken = getToken();
        const loggedInUserEmail = localStorage.getItem("app_user_identifier");
 
        if (!appToken) {
          setStatus("requires_login");
          setMessage(`'${details.projectName}' 프로젝트에 참여하려면 로그인이 필요합니다.`);
        } else if (details.invitedEmail && loggedInUserEmail && loggedInUserEmail.toLowerCase() !== details.invitedEmail.toLowerCase()) {
          setStatus("wrong_user");
        } else {
          setStatus("prompt");
        }
      } else {
        setStatus("error");
        setMessage(res.error.message);
      }
    };
    fetchDetails();
  }, [inviteToken]);

  const handleAction = async (action: 'accept' | 'decline') => {

    setStatus("loading");
    setMessage(action === 'accept' ? "초대를 수락하는 중..." : "초대를 거절하는 중...");

    const endpoint = action === 'accept' ? '/api/invitations/accept' : '/api/invitations/decline';
    const res = await apiCall(endpoint, { 
      method: 'POST', 
      body: JSON.stringify({ 
        token: inviteToken 
      }) 
    });
    
    if(res.success) {
      setStatus("success");
      const successMessage = action === 'accept' ? "초대를 수락했습니다! 대시보드로 이동합니다." : "초대를 거절했습니다. 대시보드로 이동합니다.";
      setMessage(successMessage);
      toast({ title: "성공", description: successMessage.split('!')[0] });
      router.push('/dashboard');
    } else {
      setStatus("error");
      setMessage(res.error.message);
    }
  };
  
  const handleLogout = () => {
    removeToken();
    toast({ description: "로그아웃되었습니다. 초대받은 계정으로 다시 로그인해주세요." });
    router.push(`/login?redirect=/accept-invitation?token=${inviteToken}`);
  };
  
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{message}</p>
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

  if (status === "success") {
    return (
       <div className="text-center space-y-4">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">처리 완료!</h2>
        <p className="text-muted-foreground px-4">{message}</p>
      </div>
    );
  }

  if (status === "wrong_user") {
    return (
      <div className="text-center space-y-4">
        <UserCheck className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="text-xl font-semibold">로그인 계정 확인 필요</h2>
        {invitationDetails && (
            <p className="text-muted-foreground px-4 leading-relaxed">
            <strong>{invitationDetails.inviterName}</strong>님의 <strong>'{invitationDetails.projectName}'</strong> 프로젝트 초대는<br/> 
            <span className="font-bold text-primary">{invitationDetails.invitedEmail}</span> 계정으로 전송되었습니다.
            </p>
        )}
        <p className="text-sm text-muted-foreground">현재 다른 계정으로 로그인되어 있습니다.</p>
        <div className="flex w-full items-center space-x-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> 로그아웃</Button>
            <Button className="flex-1" onClick={() => router.push('/dashboard')}>대시보드로 돌아가기</Button>
        </div>
      </div>
    );
  }
  
  if (status === "requires_login") {
    const redirectUrl = `/accept-invitation?token=${inviteToken}`;
    return (
      <div className="text-center space-y-4">
        <LogIn className="mx-auto h-16 w-16 text-primary" />
        <h2 className="text-xl font-semibold">로그인 필요</h2>
        {invitationDetails && (
            <p className="text-muted-foreground px-4 leading-relaxed">
            <strong>{invitationDetails.inviterName}</strong>님이 당신을 <br/> 
            <span className="font-semibold text-foreground">'{invitationDetails.projectName}'</span> 프로젝트에 초대했습니다.
            </p>
        )}
        <p className="text-sm text-muted-foreground pt-2">{message}</p>
        <div className="pt-4">
            <Button className="w-full" onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`)}>
                로그인 또는 회원가입
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <MailWarning className="mx-auto h-16 w-16 text-primary" />
      <h2 className="text-xl font-semibold">프로젝트 초대</h2>
      {invitationDetails && (
        <p className="text-muted-foreground px-4 leading-relaxed">
          <strong>{invitationDetails.inviterName}</strong>님이 당신을 <br />
          <span className="font-semibold text-foreground">'{invitationDetails.projectName}'</span> 프로젝트에 초대했습니다.
        </p>
      )}
      <div className="flex w-full items-center space-x-4 pt-4">
        <Button variant="outline" className="flex-1" onClick={() => handleAction('decline')}>거절</Button>
        <Button className="flex-1" onClick={() => handleAction('accept')}>수락</Button>
      </div>
    </div>
  );
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