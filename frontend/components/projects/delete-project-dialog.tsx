"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Trash } from "lucide-react"
import { apiCall } from "@/lib/api"

export function DeleteProjectDialog({
  projectId,
  projectName,
  onProjectDeleted,
}: {
  projectId: number | string;
  projectName: string;
  onProjectDeleted?: () => void;
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const handleDelete = async () => {
    if (confirmText !== projectName) {
      toast({
        title: "확인 실패",
        description: "프로젝트를 삭제하려면 프로젝트 이름을 정확하게 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const response = await apiCall(
      `/api/projects/${projectId}`, 
      { method: "DELETE" }
    );

    if (response.success) {
      toast({
        title: "프로젝트 삭제됨",
        description: `"${projectName}" 프로젝트가 성공적으로 삭제되었습니다.`,
      });
      if (onProjectDeleted) {
        onProjectDeleted(); 
      }
      setOpen(false);
    } else {
      console.error("프로젝트 삭제 실패:", response.error);
      toast({
        title: "오류 발생",
        description: response.error.message || "프로젝트를 삭제할 수 없습니다.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };
    
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setConfirmText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          프로젝트 삭제
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 삭제 확인</DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 업무가 영구적으로 삭제됩니다.
            정말로 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              삭제를 하려면 아래에 프로젝트 이름 <strong className="text-foreground">{projectName}</strong> 을(를) 입력하세요:
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-delete-project" className="sr-only">프로젝트 이름 확인</Label>
            <Input
              id="confirm-delete-project"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`"${projectName}" 입력`}
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || confirmText !== projectName}
          >
            {isLoading ? "삭제 중..." : "예, 삭제합니다"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}