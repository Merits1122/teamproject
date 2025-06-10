// frontend/components/projects/create-project-dialog.tsx
"use client"

import type React from "react"
import { useRef, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Plus } from "lucide-react"
import { getToken } from "@/lib/auth" // 경로가 맞는지 확인해주세요!
import { format } from "date-fns"

// --- 타입 정의 시작 ---
interface TaskSummaryForDialog {
  id: number;
  title: string;
  status: string;
  dueDate?: string;
}

interface ApiProjectForDialog {
  id: number;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status: string;
  creatorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks: TaskSummaryForDialog[];
}
// --- 타입 정의 끝 ---

export function CreateProjectDialog({ onProjectCreated }: { onProjectCreated?: (project: ApiProjectForDialog) => void }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const startDateInputRef = useRef<HTMLInputElement>(null); // 시작일 input ref
  const endDateInputRef = useRef<HTMLInputElement>(null);   // 마감일 input ref
  
  const initialFormData = {
    name: "",
    description: "",
    startDate: format(new Date(), 'yyyy-MM-dd'), // 오늘 날짜를 문자열로
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'), // 7일 후를 문자열로
  };
  const [formData, setFormData] = useState(initialFormData)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }


  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "프로젝트 이름 필요",
        description: "프로젝트 이름을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      toast({
        title: "날짜 오류",
        description: "시작일은 마감일보다 이전이거나 같아야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true)
    const token = getToken(); // auth.ts의 getToken 사용
    // checkTokenStatus(); // 필요시 디버깅용으로 호출

    if (!token) {
      toast({
        title: "인증 오류",
        description: "프로젝트를 생성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const projectDataForApi = {
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate || null, // 빈 문자열이면 null로 전송
      endDate: formData.endDate || null,   // 빈 문자열이면 null로 전송
      status: "TODO",
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectDataForApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "알 수 없는 서버 오류가 발생했습니다." }));
        console.error("API Error Data:", errorData);
        throw new Error(errorData.message || `프로젝트 생성 실패 (상태: ${response.status})`);
      }

      const createdApiProject: ApiProjectForDialog = await response.json();

      toast({
        title: "프로젝트 생성 완료!",
        description: `${createdApiProject.name} 프로젝트가 성공적으로 생성되었습니다.`,
      })

      if (onProjectCreated) {
        onProjectCreated(createdApiProject);
      }

      setFormData(initialFormData)
      setOpen(false)

    } catch (error: any) {
      console.error("Submit Error:", error);
      toast({
        title: "문제가 발생했습니다",
        description: error.message || "프로젝트를 생성할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setFormData(initialFormData); // 다이얼로그 닫힐 때 폼 초기화
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />새 프로젝트
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 생성</DialogTitle>
          <DialogDescription>새 프로젝트를 추가하여 작업을 추적하고 팀과 협업하세요.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4"> {/* ⬅️ 이 div가 자식 요소들의 주된 컨테이너 */}
          <div className="grid gap-2">
            <Label htmlFor="project-name-dialog">프로젝트 이름</Label>
            <Input
              id="project-name-dialog"
              name="name"
              placeholder="프로젝트 이름 입력"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description-dialog">설명</Label>
            <Textarea
              id="project-description-dialog"
              name="description"
              placeholder="프로젝트 설명 입력"
              value={formData.description}
              onChange={handleChange}
              rows={3} // ⬅️ Textarea 행 수 조절 예시
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-start-date-dialog">시작일</Label>
              <div 
                className="relative cursor-pointer"
                onClick={() => startDateInputRef.current?.showPicker()}
              >
                <Input
                  id="project-start-date-dialog"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  ref={startDateInputRef}
                  className="w-full max-w-[200px]"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-end-date-dialog">마감일</Label>
              
              <div 
                className="relative cursor-pointer"
                onClick={() => endDateInputRef.current?.showPicker()}
              >
                <Input
                  id="project-end-date-dialog"
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  ref={endDateInputRef}
                  className="w-full max-w-[200px]"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "생성 중..." : "프로젝트 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}