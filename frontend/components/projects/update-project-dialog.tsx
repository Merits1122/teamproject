"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api";
import type { ApiProject } from "@/lib/types";
import { FilePenLine, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface UpdateProjectDialogProps {
  project: ApiProject;
  onProjectUpdated: () => void;
}

export function UpdateProjectDialog({ project, onProjectUpdated }: UpdateProjectDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null); 

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : "",
        endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : "",
      });
    }
  }, [isOpen, project]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "프로젝트 이름 필요", description: "프로젝트 이름을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      toast({ title: "날짜 오류", description: "시작일은 마감일보다 이전이거나 같아야 합니다.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const response = await apiCall(`/api/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        status: project.status,
      }),
    });

    if (response.success) {
      toast({ title: "성공", description: "프로젝트 정보가 성공적으로 수정되었습니다." });
      onProjectUpdated();
      setIsOpen(false);
    } else {
      toast({ title: "오류", description: response.error.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePenLine className="mr-2 h-4 w-4" />
          프로젝트 수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
          <DialogDescription>프로젝트의 세부 정보를 수정합니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name-edit">프로젝트 이름</Label>
            <Input
              id="project-name-edit"
              name="name"
              placeholder="프로젝트 이름 입력"
              value={formData.name}
              onChange={handleChange}
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description-edit">설명</Label>
            <Textarea
              id="project-description-edit"
              name="description"
              placeholder="프로젝트 설명 입력"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-start-date-edit">시작일</Label>
              <div className="relative" onClick={() => startDateInputRef.current?.showPicker()}>
                <Input
                  id="project-start-date-edit"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  ref={startDateInputRef}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-end-date-edit">마감일</Label>
              <div className="relative" onClick={() => endDateInputRef.current?.showPicker()}>
                <Input
                  id="project-end-date-edit"
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  ref={endDateInputRef}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            변경사항 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}