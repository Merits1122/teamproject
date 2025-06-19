"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { ApiTask, ProjectMember, Status, TaskPriority } from "@/lib/types";
import { apiCall } from "@/lib/api"

interface CreateTaskDialogProps {
  projectId: string;
  members: ProjectMember[];
  onTaskCreated: (createdTaskData: ApiTask) => void;
}

export function CreateTaskDialog({ projectId, members, onTaskCreated }: CreateTaskDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const initialFormData = {
    title: "",
    description: "",
    status: "TODO" as Status,
    assigneeId: "",
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
      setFormData((prev) => ({ ...prev, [name]: value as Status }))
    } else if (name === "priority") {
      setFormData((prev) => ({ ...prev, [name]: value as TaskPriority }))
    } else if (name === "assigneeId") {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "업무 제목 필요",
        description: "업무 제목을 입력해주세요.",
        variant: "destructive",
      })
      return;
    }

    setIsLoading(true);

    const taskDataForApi = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined,
    };

    const response = await apiCall<ApiTask>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskDataForApi),
    });

    if (response.success) {
      const createdTask = response.data;
      toast({
        title: "업무 생성 완료!",
        description: `'${createdTask.title}' 업무가 성공적으로 생성되었습니다.`,
      });
      if (onTaskCreated) {
        onTaskCreated(createdTask);
      }
      setOpen(false);
    } else {
      console.error("업무 생성 API 호출 실패:", response.error);
      toast({
        title: "문제 발생",
        description: response.error.message || "업무를 생성할 수 없습니다.",
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
              value={formData.title}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description-create">설명</Label>
            <Textarea
              id="task-description-create"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={isLoading}
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
                  <SelectItem value="TODO">할 일</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                  <SelectItem value="DONE">완료됨</SelectItem>
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
                  <SelectItem value="LOW">낮음</SelectItem>
                  <SelectItem value="MEDIUM">보통</SelectItem>
                  <SelectItem value="HIGH">높음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-assignee-create">담당자</Label>
              <Select 
                value={formData.assigneeId}
                onValueChange={(value) => handleSelectChange("assigneeId", value)}
              >
                <SelectTrigger id="task-assignee-create">
                  <SelectValue placeholder="담당자 선택 (선택 사항)" />
                </SelectTrigger>
                <SelectContent>
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
                  className="w-full max-w-[150px]"
                  ref={dateInputRef}
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