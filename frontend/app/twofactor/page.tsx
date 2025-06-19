"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiCall } from "@/lib/api";

interface Verify2FAResponse {
  token: string;
  username?: string;
}

function Verify2FALogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
      if (emailFromUrl) {
        setEmail(decodeURIComponent(emailFromUrl));
      } else {
        toast({ title: "오류", description: "사용자 정보가 없습니다. 다시 로그인해주세요.", variant: "destructive"});
        router.push("/login");
      }
    }, [searchParams, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !code.trim() || !/^\d{6}$/.test(code.trim())) {
        toast({ title: "오류", description: "6자리 인증 코드를 정확히 입력하세요.", variant: "destructive"});
        return;
      }
      setIsLoading(true);
      const response = await apiCall<Verify2FAResponse>('/api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });

      if (response.success) {
        setToken(response.data.token, false);
            
        const identifier = response.data.username || email;
        sessionStorage.setItem("app_user_identifier", identifier);

        toast({ title: "인증 성공!", description: "로그인에 성공했습니다." });

        const redirectUrl = searchParams.get("redirect");
        if (redirectUrl) {
          router.push(decodeURIComponent(redirectUrl));
        } else {
          router.push("/dashboard");
        }
      } else {
        console.error("2단계 인증 실패:", response.error);
        toast({ title: "인증 실패", description: response.error.message, variant: "destructive" });
      }
      setIsLoading(false);
    };

    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">2단계 인증</CardTitle>
          <CardDescription>{email}로 전송된 6자리 인증 코드를 입력해주세요.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
          <Input
            id = "2fa-code"
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            placeholder="인증 코드 6자리" 
            maxLength={6}
            disabled={isLoading}
            className="text-center text-lg tracking-[0.1em]"
            autoComplete="one-time-code"
          />
          <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || code.length !== 6}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          확인 및 로그인
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export default function Verify2FAPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }>
      <Verify2FALogic />
      </Suspense>
    </div>
  );
}