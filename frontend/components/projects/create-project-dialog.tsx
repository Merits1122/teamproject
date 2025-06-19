"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { ApiProject } from "@/lib/types"
import { apiCall } from "@/lib/api"

interface CreateProjectDialogProps {
  onProjectCreated: (createdProject: ApiProject) => void;
}

export function CreateProjectDialog({ onProjectCreated }: CreateProjectDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null); 
  
  const initialFormData = {
    name: "",
    description: "",
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
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

    const projectDataForApi = {
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null, 
      status: "TODO",
    };

    const response = await apiCall<ApiProject>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectDataForApi),
    });

    if (response.success) {
      const createdApiProject = response.data;
      toast({
        title: "프로젝트 생성 완료!",
        description: `'${createdApiProject.name}' 프로젝트가 성공적으로 생성되었습니다.`,
      });
      if (onProjectCreated) {
        onProjectCreated(createdApiProject);
      }
      setOpen(false);
    } else {
      console.error("프로젝트 생성 API 호출 실패:", response.error);
      toast({
        title: "문제 발생",
        description: response.error.message || "프로젝트를 생성할 수 없습니다.",
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />새 프로젝트
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 생성</DialogTitle>
          <DialogDescription>새 프로젝트를 추가하여 작업을 추적하고 팀과 협업하세요.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name-dialog">프로젝트 이름</Label>
            <Input
              id="project-name-dialog"
              name="name"
              placeholder="프로젝트 이름 입력"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
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
              rows={3}
              disabled={isLoading}
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