"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog,DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Loader2 } from "lucide-react"
import { apiCall } from "@/lib/api";
import { ProjectRole } from "@/lib/types"; 

interface InvitedMemberInfo {
  email: string;
  role: ProjectRole;
}

interface InviteTeamDialogProps {
  projectId: string;
  onMemberInvited?: (invitedInfo: InvitedMemberInfo) => void;
}

export function InviteTeamDialog({ projectId, onMemberInvited }: InviteTeamDialogProps) {
  const { toast } = useToast();
  const initialFormData = {
    email: "",
    role: "MEMBER" as ProjectRole,
  };
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as ProjectRole }));
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
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      toast({
        title: "유효하지 않은 이메일",
        description: "올바른 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "ADMIN") {
      toast({
        title: "역할 오류",
        description: "ADMIN 역할은 초대 시 직접 부여할 수 없습니다. 멤버 초대 후 역할을 변경해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);


    const response = await apiCall(`/api/projects/${projectId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email: formData.email.trim(), role: formData.role }),
    });

    if (response.success) {
      toast({
        title: "초대 전송됨!",
        description: `${formData.email}(으)로 초대를 성공적으로 보냈습니다.`,
      });
      if (onMemberInvited) {
        onMemberInvited({ email: formData.email, role: formData.role });
      }
      setOpen(false);
    } else {
      let toastTitle = "초대 실패";
      if (response.error.status === 409) toastTitle = "알림";
      if (response.error.status === 400) toastTitle = "초대 불가";
      
      console.error("멤버 초대 실패:", response.error);
      toast({
        title: toastTitle,
        description: response.error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>팀 멤버 초대</DialogTitle>
          <DialogDescription>이 프로젝트에 협업할 새 팀 멤버를 이메일로 초대하세요.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="member-email-invite">이메일 주소</Label>
            <Input
              id="member-email-invite"
              name="email"
              type="email"
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