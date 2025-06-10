"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Loader2 } from "lucide-react" // Loader2 아이콘 추가
import { getToken } from "@/lib/auth" // auth.ts 경로 확인

// 백엔드의 ProjectRole Enum과 일치하는 타입 (대문자)
type ProjectRoleType = "ADMIN" | "MEMBER" | "VIEWER";

// 부모 컴포넌트(ProjectDetailPage)가 받을 멤버 정보 타입 (API 응답에 따라 조정될 수 있음)
// ProjectService의 InviteUserToProject는 void를 반환하지만, 성공 시 프론트에서
// 멤버 목록을 다시 불러오거나, 임시로 PENDING 상태의 멤버를 추가할 수 있습니다.
// 여기서는 onMemberInvited가 초대된 이메일과 역할을 받을 수 있도록 간단히 정의합니다.
// 실제로는 ProjectMemberResponse와 유사한 타입을 받는 것이 더 유용할 수 있습니다.
interface InvitedMemberInfo {
  email: string;
  role: ProjectRoleType;
  // status: "PENDING"; // 예시
}

interface InviteTeamDialogProps {
  projectId: string; // string으로 통일 (URL 파라미터는 string)
  onMemberInvited?: (invitedInfo: InvitedMemberInfo) => void; // 콜백 타입 수정
}

export function InviteTeamDialog({ projectId, onMemberInvited }: InviteTeamDialogProps) {
  const { toast } = useToast();
  const initialFormData = {
    email: "",
    role: "MEMBER" as ProjectRoleType,
  };
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as ProjectRoleType })); // ⬅️ 타입 단언
  };

  const handleSubmit = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "이메일 필요",
        description: "초대할 팀 멤버의 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    // 간단한 이메일 형식 유효성 검사 (선택 사항)
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
        toast({
            title: "유효하지 않은 이메일",
            description: "올바른 이메일 주소를 입력해주세요.",
            variant: "destructive",
        });
        return;
    }

    // ADMIN 역할 직접 초대 방지 (백엔드에서도 검증하지만, 프론트에서도 방지)
    if (formData.role === "ADMIN") {
        toast({
            title: "역할 오류",
            description: "ADMIN 역할은 초대 시 직접 부여할 수 없습니다. 멤버 초대 후 역할을 변경해주세요.",
            variant: "destructive",
        });
        return;
    }


    setIsLoading(true);
    const token = getToken();

    if (!token) {
      toast({
        title: "인증 오류",
        description: "멤버를 초대하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const invitationData = {
      email: formData.email.trim(),
      role: formData.role, // "MEMBER" 또는 "VIEWER" (대문자)
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(invitationData),
        }
      );

      // 🔽 응답 상태 코드에 따른 분기 처리
      if (response.ok) { // 성공 (2xx 상태 코드)
        toast({
          title: "초대 전송됨!",
          description: `${formData.email}(으)로 초대를 성공적으로 보냈습니다.`,
        });
        if (onMemberInvited) {
          onMemberInvited({ email: formData.email, role: formData.role });
        }
        setOpen(false);
      } else {
        // 성공이 아닌 다른 응답 처리
        const errorMessage = await response.text(); // 오류 메시지는 JSON이 아닐 수 있으므로 text()로 받음
        
        if (response.status === 409) { // 409 Conflict: 이미 멤버인 경우
          toast({
            title: "알림",
            description: errorMessage || "이미 해당 프로젝트의 멤버인 사용자입니다.",
            variant: "default", // ⬅️ 오류가 아닌 정보성 토스트 (파란색 또는 회색)
          });
        } else if (response.status === 400) { // 400 Bad Request: 이미 초대 대기 중, 자기 자신 초대 등
          toast({
            title: "초대 불가",
            description: errorMessage || "이미 초대 대기 중이거나, 자기 자신은 초대할 수 없습니다.",
            variant: "destructive",
          });
        } else { // 그 외 401, 403, 500 등 다른 모든 오류
          throw new Error(errorMessage || `초대 실패 (상태 코드: ${response.status})`);
        }
      }

    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast({
        title: "문제가 발생했습니다",
        description: error.message || "초대를 보낼 수 없습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 다이얼로그가 닫힐 때 폼 초기화
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setFormData(initialFormData);
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          팀 멤버 초대
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md"> {/* 다이얼로그 너비 조정 */}
        <DialogHeader>
          <DialogTitle>팀 멤버 초대</DialogTitle>
          <DialogDescription>이 프로젝트에 협업할 새 팀 멤버를 이메일로 초대하세요.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="member-email-invite">이메일 주소</Label> {/* ID 고유하게 변경 */}
            <Input
              id="member-email-invite"
              name="email"
              type="email"
              placeholder="colleague@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-role-invite">역할</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger id="member-role-invite">
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                {/* ADMIN 역할은 초대 시 직접 부여하지 않음 (백엔드 정책과 일치) */}
                {/* <SelectItem value="ADMIN">Admin</SelectItem> */}
                <SelectItem value="MEMBER">멤버 (Member)</SelectItem>
                <SelectItem value="VIEWER">뷰어 (Viewer)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>멤버:</strong> 업무 생성 및 수정 가능
              <br />
              <strong>뷰어:</strong> 프로젝트 및 업무 보기만 가능
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "초대 중..." : "초대 보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}