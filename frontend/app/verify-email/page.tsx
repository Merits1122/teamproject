// app/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

function VerifyEmailLogic() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [message, setMessage] = useState("이메일을 인증하는 중입니다...");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            setMessage("유효하지 않은 인증 링크입니다.");
            return;
        }

        const verify = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/auth/verify-email?token=${token}`
                );
                const responseText = await response.text();
                if (!response.ok) {
                    throw new Error(responseText || "인증에 실패했습니다.");
                }
                setStatus("success");
                setMessage(responseText);
            } catch (error: any) {
                setStatus("error");
                setMessage(error.message);
            }
        };
        verify();
    }, [searchParams]);

    return (
         <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">이메일 인증</CardTitle>
                <CardDescription>계정 활성화를 위한 마지막 단계입니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 min-h-[150px]">
                {status === "verifying" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                {status === "success" && <CheckCircle className="h-8 w-8 text-green-500" />}
                {status === "error" && <AlertTriangle className="h-8 w-8 text-destructive" />}
                <p className={`text-center text-sm ${status === "error" ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>
                {status !== 'verifying' && (
                    <Button asChild>
                        <Link href="/login">로그인 페이지로 이동</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <VerifyEmailLogic />
            </Suspense>
        </div>
    );
}