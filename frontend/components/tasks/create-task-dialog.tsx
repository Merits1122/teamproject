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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { getToken } from "@/lib/auth"
import type { Task, CreatedTaskPayload } from "./task-board"
import type { Member, TaskStatus, TaskPriority, ApiTaskResponse } from "@/lib/types";

interface CreatedTaskResponse {
    id: number | string;
    title: string;
    description?: string;
    status: TaskStatus;
    
    priority: TaskPriority;
    dueDate?: string;
    createdAt: string;
    // assigneeId 등 백엔드가 실제로 반환하는 필드에 맞게 추가
}

interface CreateTaskDialogProps {
  projectId: string;
  members: Member[]; // task-board.tsx의 Member 타입
  onTaskCreated?: (createdTask: CreatedTaskPayload) => void;
}

export function CreateTaskDialog({ projectId, members, onTaskCreated }: CreateTaskDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const initialFormData = {
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    assigneeId: "", // 초기값 빈 문자열 (플레이스홀더 표시용, "미배정" 상태)
    dueDate: "",
    priority: "MEDIUM" as TaskPriority,
  };
  const [formData, setFormData] = useState(initialFormData)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "status") {
        setFormData((prev) => ({ ...prev, [name]: value as TaskStatus }))
    } else if (name === "priority") {
        setFormData((prev) => ({ ...prev, [name]: value as TaskPriority }))
    } else if (name === "assigneeId") {
        // Select에서 value가 ""로 오면 플레이스홀더가 선택된 것과 유사 (실제로는 "" 값)
        // 이 "" 값을 그대로 assigneeId에 저장
        setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  //const handleDateChange = (date: Date | undefined) => {
    //if (date) {
      //setFormData((prev) => ({ ...prev, dueDate: date }))
    //}
  //}
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "업무 제목 필요",
        description: "업무 제목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true);
    const token = getToken();

    if (!token) {
      toast({
        title: "인증 오류",
        description: "업무를 생성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const taskDataForApi = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      // assigneeId는 백엔드 API 명세에 따라 포함 여부 및 타입 결정
      // formData.assigneeId가 "" 이면 null 또는 undefined로 보내거나, 아예 안 보낼 수 있음
      assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskDataForApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "알 수 없는 서버 오류" }));
        throw new Error(errorData.message || `업무 생성 실패 (상태: ${response.status})`);
      }

      const createdTaskFromApi: CreatedTaskPayload = await response.json();

      toast({
        title: "업무 생성 완료!",
        description: `${createdTaskFromApi.title} 업무가 성공적으로 생성되었습니다.`,
      })

      if (onTaskCreated) {
        onTaskCreated(createdTaskFromApi); // ⬅️ API 응답 객체 그대로 전달
      }

      setFormData(initialFormData);
      setOpen(false);

    } catch (error: any) {
      toast({
        title: "문제가 발생했습니다",
        description: error.message || "업무를 생성할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          업무 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>새 업무 생성</DialogTitle>
          <DialogDescription>이 프로젝트에 새 업무를 추가합니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title-create">업무 제목</Label>
            <Input
              id="task-title-create"
              name="title"
              placeholder="업무 제목 입력"
              value={formData.title}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description-create">설명</Label>
            <Textarea
              id="task-description-create"
              name="description"
              placeholder="업무 상세 설명 (선택 사항)"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-status-create">상태</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                <SelectTrigger id="task-status-create">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">할 일 (TODO)</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행 중 (IN_PROGRESS)</SelectItem>
                  <SelectItem value="DONE">완료됨 (DONE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-priority-create">우선순위</Label>
              <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                <SelectTrigger id="task-priority-create">
                  <SelectValue placeholder="우선순위 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">낮음 (Low)</SelectItem>
                  <SelectItem value="MEDIUM">보통 (Medium)</SelectItem>
                  <SelectItem value="HIGH">높음 (High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-assignee-create">담당자</Label>
              <Select 
                value={formData.assigneeId} // 빈 문자열이면 플레이스홀더 표시
                onValueChange={(value) => handleSelectChange("assigneeId", value)}
              >
                <SelectTrigger id="task-assignee-create">
                  {/* SelectValue의 placeholder는 Select의 value가 ""일 때 기본적으로 표시됨 */}
                  {/* 또는 formData.assigneeId가 ""일때 명시적으로 placeholder를 보여줄 수 도 있음 */}
                  <SelectValue placeholder="담당자 선택 (선택 사항)" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">미배정</SelectItem> 
                    위 SelectItem은 제거합니다. 
                    Select의 value가 ""일 때 placeholder가 "미배정" 역할을 하거나,
                    사용자가 아무것도 선택하지 않은 상태 (즉, formData.assigneeId === "")를
                    "미배정"으로 간주합니다.
                    만약 명시적으로 "미배정"을 목록에서 선택해 "" 값으로 되돌리고 싶다면,
                    다른 접근 방식(예: 별도 클리어 버튼)이나 SelectItem에 다른 고유값(예: "UNASSIGNED")을 사용해야 합니다.
                    여기서는 플레이스홀더를 활용합니다.
                  */}
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due-date-create">마감일</Label>
              {/* 🔽 클릭 영역 확장을 위해 div로 감싸고 onClick 이벤트 추가 */}
              <div 
                className="relative cursor-pointer"
                onClick={() => dateInputRef.current?.showPicker()}
              >
                <Input
                  id="task-due-date-create"
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full max-w-[150px]" // 여기는 sm:grid-cols-2 컨테이너 안이므로 w-full이 적절
                  ref={dateInputRef} // ⬅️ ref 연결
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {setOpen(false); setFormData(initialFormData);}}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "생성 중..." : "업무 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}