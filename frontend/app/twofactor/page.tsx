// app/verify-2fa/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/auth/verify-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || (typeof data === 'string' ? data : "코드 검증에 실패했습니다."));
            }
            
            // 최종 로그인 성공
            setToken(data.token, false); // 2FA 페이지에서는 rememberMe를 알 수 없으므로 false 처리
            toast({ title: "인증 성공!", description: "로그인에 성공했습니다." });
            const redirectUrl = searchParams.get("redirect");
            if (redirectUrl) {
                // decodeURIComponent로 인코딩된 URL을 원래대로 복원하여 이동
                router.push(decodeURIComponent(redirectUrl));
            } else {
                router.push("/dashboard");
            }
            // 🔼🔼🔼 리다이렉션 로직 수정 끝 🔼🔼🔼

        } catch(error: any) {
            toast({ title: "인증 실패", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
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
                        value={code} 
                        onChange={(e) => setCode(e.target.value)} 
                        placeholder="인증 코드 6자리" 
                        maxLength={6}
                        disabled={isLoading}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
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
            <Suspense fallback={<div>Loading...</div>}>
                <Verify2FALogic />
            </Suspense>
        </div>
    );
}