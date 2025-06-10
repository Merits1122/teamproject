"use client"

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
import { useToast } from "@/hooks/use-toast"
import { Trash } from "lucide-react"
import { getToken } from "@/lib/auth" // ⬅️ auth.ts에서 getToken 함수 임포트 (경로 확인)

export function DeleteProjectDialog({
  projectId,
  projectName,
  onProjectDeleted,
}: {
  projectId: number | string; // ProjectDetailPage에서 projectId가 string | null일 수 있으므로, Dialog를 여는 시점에는 확실한 ID가 전달된다고 가정
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
      })
      return
    }

    setIsLoading(true);
    const token = getToken(); // ⬅️ 인증 토큰 가져오기

    if (!token) {
      toast({
        title: "인증 오류",
        description: "프로젝트를 삭제하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}`, // ⬅️ API 엔드포인트
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`, // ⬅️ 인증 헤더 추가
            // DELETE 요청은 보통 Content-Type이나 body가 필요 없습니다.
          },
        }
      );

      if (response.ok) { // HTTP 상태 코드가 200-299 사이인지 확인 (보통 삭제는 200 또는 204)
        toast({
          title: "프로젝트 삭제됨",
          description: `"${projectName}" 프로젝트가 성공적으로 삭제되었습니다.`,
        });

        if (onProjectDeleted) {
          onProjectDeleted(); // 부모 컴포넌트에 삭제 알림 (예: 목록 새로고침)
        }

        setConfirmText(""); // 확인 텍스트 초기화
        setOpen(false);     // 다이얼로그 닫기
      } else {
        // 서버에서 에러 메시지를 JSON 형태로 보냈을 경우를 대비
        let errorMessage = `프로젝트 삭제에 실패했습니다. (상태: ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
          console.error("Could not parse error response as JSON", e);
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      toast({
        title: "오류 발생",
        description: error.message || "프로젝트를 삭제할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 다이얼로그가 열릴 때 확인 텍스트 초기화
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setConfirmText(""); // 다이얼로그가 닫힐 때 입력 내용 초기화
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}> {/* ⬅️ onOpenChange 핸들러 연결 */}
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          프로젝트 삭제
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md"> {/* 다이얼로그 너비 조정 예시 */}
        <DialogHeader>
          <DialogTitle>프로젝트 삭제 확인</DialogTitle>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 업무가 영구적으로 삭제됩니다.
            정말로 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4"> {/* 경고 스타일 조정 */}
            <p className="text-sm font-medium text-destructive">
              삭제를 확인하려면 아래에 프로젝트 이름 <strong className="text-foreground">{projectName}</strong> 을(를) 입력하세요:
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-delete-project" className="sr-only">프로젝트 이름 확인</Label> {/* sr-only로 시각적으로 숨김 */}
            <Input
              id="confirm-delete-project"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`"${projectName}" 입력`}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}> {/* ⬅️ handleOpenChange 사용 */}
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || confirmText !== projectName} // 버튼 비활성화 조건
          >
            {isLoading ? "삭제 중..." : "예, 삭제합니다"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}