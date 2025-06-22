"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { removeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";

export function RouteGuard({ 
    children 
}: { 
    children: React.ReactNode 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isWrongUser, setIsWrongUser] = useState(false);

  const handleIdle = () => {
    removeToken();
    router.push('/login?error=session_expired');
  };
  useIdleTimeout(handleIdle, 600000);

  useEffect(() => {
    const recipientId = searchParams.get('recipientId');
    if (recipientId) {
      const loggedInUserId = localStorage.getItem('app_user_id');
      if (loggedInUserId && loggedInUserId !== recipientId) {
        setIsWrongUser(true);
      } else {
        setIsWrongUser(false);
      }
    } else {
      setIsWrongUser(false);
    }
  }, [pathname, searchParams]);

  if (isWrongUser) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-8 text-center">
        <UserCheck className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">잘못된 계정으로 접근했습니다</h1>
        <p className="max-w-md mt-2 text-muted-foreground">
          로그아웃한 후 다시 로그인해주세요.
        </p>
        <div className="flex gap-4 pt-6">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
                대시보드로 돌아가기
            </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}