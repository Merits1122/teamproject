"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Edit, Trash, Loader2, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid as isValidDate, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Status,  TaskPriority, ProjectMember, ApiTask } from "@/lib/types";
import { CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader,AlertDialogFooter,AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TaskComments } from "./task-comments";
import { apiCall } from "@/lib/api";

export interface TaskDetailDialogProps {
  task: ApiTask;
  members: ProjectMember[];
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (updatedTask: ApiTask) => void; 
  onTaskDeleted: (taskId: number | string) => void;
  canModify: boolean;
}

const parseLocalDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
        return new Date(dateString.replace(/-/g, '/'));
    } catch(e) {
        return null;
    }
};

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};

export function TaskDetailDialog({
  task: initialTask,
  members,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
  canModify,
}: TaskDetailDialogProps) {
  const { toast } = useToast();

  const [currentTask, setCurrentTask] = useState<ApiTask>(initialTask);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editedTask, setEditedTask] = useState({
    title: initialTask.title,
    description: initialTask.description || "",
    status: initialTask.status,
    priority: initialTask.priority,
    dueDate: initialTask.dueDate && isValidDate(parseISO(initialTask.dueDate)) ? parseISO(initialTask.dueDate) : new Date(),
    assigneeId: initialTask.assignee?.id.toString() || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
    setEditedTask({
      title: initialTask.title,
      description: initialTask.description || "",
      status: initialTask.status,
      priority: initialTask.priority,
      dueDate: parseLocalDateString(initialTask.dueDate) || new Date(),
      assigneeId: initialTask.assignee?.id.toString() || "",
    });
  }, [open, initialTask]);

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: "status" | "priority" | "assigneeId", value: string) => {
    if (name === "status") {
      setEditedTask((prev) => ({ ...prev, status: value as Status }));
    } else if (name === "priority") {
      setEditedTask((prev) => ({ ...prev, priority: value as TaskPriority }));
    } else if (name === "assigneeId") {
      setEditedTask((prev) => ({ ...prev, assigneeId: value === "none" ? "" : value }));
    }
  };

  const handleEditTaskToggle = () => setIsEditing(!isEditing);
  
  const handleSaveTask = async () => {
    if (!editedTask.title.trim()) {
      toast({ 
        title: "오류", 
        description: "업무 제목은 필수입니다.", 
        variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const response = await apiCall<ApiTask>(`/api/tasks/${initialTask.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: editedTask.title,
        description: editedTask.description,
        status: editedTask.status,
        priority: editedTask.priority,
        dueDate: editedTask.dueDate ? format(editedTask.dueDate, "yyyy-MM-dd") : null,
        assigneeId: editedTask.assigneeId === "none" ? null : parseInt(editedTask.assigneeId, 10),
      }),
    });

    if (response.success) {
      toast({ 
        title: "업무 수정됨", 
        description: "업무 정보가 성공적으로 업데이트되었습니다." });
      onTaskUpdated(response.data);
      setIsEditing(false);
    } else {
      toast({ 
        title: "업무 수정 실패", 
        description: response.error.message, 
        variant: "destructive" });
    }
    setIsSubmitting(false);
  };
    

  const handleDeleteTask = async () => {
    if (deleteConfirmText !== currentTask.title) {
      toast({ 
        title: "확인 실패", 
        description: "업무 제목을 정확히 입력해주세요.", 
        variant: "destructive" });
      return false;
    }
    setIsSubmitting(true);
    const response = await apiCall(`/api/tasks/${initialTask.id}`, { method: "DELETE" });

    if (response.success) {
      toast({ 
        title: "업무 삭제됨", 
        description: `"${initialTask.title}" 업무가 삭제되었습니다.`});
      onTaskDeleted(initialTask.id);
      return true;
    } else {
      toast({ 
        title: "업무 삭제 실패", 
        description: response.error.message, 
        variant: "destructive" });
    }
    setIsSubmitting(false);
    return false;
  };

  const handleDialogClose = (openState: boolean) => {
    if (!openState) setIsEditing(false);
    onOpenChange(openState);
  };

  const priorityDisplayMap: Record<TaskPriority, { text: string, className: string }> = {
    LOW: { text: "낮음", className: "bg-green-100 text-green-700 border-green-300" },
    MEDIUM: { text: "보통", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    HIGH: { text: "높음", className: "bg-red-100 text-red-700 border-red-300" },
  };

  const statusDisplayMap: Record<Status, { text: string, className: string }> = {
    TODO: { text: "할 일", className: "bg-gray-100 text-gray-800 border-gray-300" },
    IN_PROGRESS: { text: "진행 중", className: "bg-blue-100 text-blue-800 border-blue-300" },
    DONE: { text: "완료됨", className: "bg-green-100 text-green-800 border-green-300" },
  };


  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pr-12 relative">
          {isEditing ? (
            <div className="space-y-1">
              <Label htmlFor="task-title-edit-dialog" className="sr-only">제목</Label>
              <Input
                id="task-title-edit-dialog"
                name="title"
                value={editedTask.title}
                onChange={handleEditInputChange}
                className="text-xl font-bold h-9"
                placeholder="업무 제목"
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <DialogTitle className="text-xl font-bold line-clamp-2">{currentTask.title}</DialogTitle>
          )}
           <CardDescription className="text-xs pt-1">
            생성일: {currentTask.createdAt ? formatDistanceToNow(parseISO(currentTask.createdAt), { addSuffix: true, locale: ko }) : "정보 없음"}
          </CardDescription>
            {!isEditing && canModify &&(
                <div className="absolute top-0 right-0 flex items-center gap-2 pt-4 pr-4">
                    <Button variant="outline" size="sm" onClick={handleEditTaskToggle} className="h-8 px-2 text-xs">
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        수정
                    </Button>
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-8 px-2 text-xs">
                                <Trash className="h-3.5 w-3.5 mr-1" />
                                삭제
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>업무 삭제 확인</AlertDialogTitle>
                            <AlertDialogDescription>
                                이 작업은 되돌릴 수 없습니다. 업무 <strong className="text-foreground">{currentTask.title}</strong> 을(를) 영구적으로 삭제합니다.
                                삭제를 확인하려면 아래에 업무 제목을 입력하세요.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                                id="confirm-delete-task-dialog"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={`"${currentTask.title}" 입력`}
                                className="mt-2"
                                disabled={isSubmitting}
                            />
                            <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel onClick={() => setDeleteConfirmText("")} disabled={isSubmitting}>취소</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteTask}
                                disabled={deleteConfirmText !== currentTask.title || isSubmitting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                삭제
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </DialogHeader>

        <div className="flex-grow overflow-y-auto space-y-6 pr-2 py-2 mt-2">
          <div className="space-y-1">
            <Label htmlFor="task-description-edit-dialog" className="text-xs font-semibold text-muted-foreground">설명</Label>
            {isEditing ? (
              <Textarea
                id="task-description-edit-dialog"
                name="description"
                value={editedTask.description}
                onChange={handleEditInputChange}
                placeholder="업무 상세 설명"
                className="min-h-[100px] text-sm"
                disabled={isSubmitting}
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted/30 p-3 rounded-md min-h-[60px]">
                {currentTask.description || "설명이 제공되지 않았습니다."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="task-status-edit-dialog" className="text-xs font-semibold text-muted-foreground">상태</Label>
                {isEditing ? (
                  <Select value={editedTask.status} onValueChange={(value) => handleEditSelectChange("status", value as Status)} disabled={!canModify ||isSubmitting}>
                    <SelectTrigger id="task-status-edit-dialog"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">할 일</SelectItem>
                      <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                      <SelectItem value="DONE">완료됨</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge id="task-status-display" variant="outline" className={`text-sm ${statusDisplayMap[currentTask.status]?.className || ''}`}>
                      {statusDisplayMap[currentTask.status]?.text || currentTask.status}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-priority-edit-dialog" className="text-xs font-semibold text-muted-foreground">우선순위</Label>
                {isEditing ? (
                  <Select value={editedTask.priority} onValueChange={(value) => handleEditSelectChange("priority", value as TaskPriority)} disabled={!canModify || isSubmitting}>
                    <SelectTrigger id="task-priority-edit-dialog"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">낮음</SelectItem>
                      <SelectItem value="MEDIUM">보통</SelectItem>
                      <SelectItem value="HIGH">높음</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge id="task-priority-display" variant="outline" className={`text-sm ${priorityDisplayMap[currentTask.priority]?.className || ''}`}>
                    {priorityDisplayMap[currentTask.priority]?.text || currentTask.priority}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="task-assignee-edit-dialog" className="text-xs font-semibold text-muted-foreground">담당자</Label>
                {isEditing ? (
                  <Select value={editedTask.assigneeId} onValueChange={(value) => handleEditSelectChange("assigneeId", value)} disabled={!canModify || isSubmitting}>
                    <SelectTrigger id="task-assignee-edit-dialog"><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">미배정</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : currentTask.assignee?.id ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={currentTask.assignee.avatarUrl|| undefined} alt={currentTask.assignee.name || undefined} />
                      <AvatarFallback>{getInitials(currentTask.assignee.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{currentTask.assignee.name}</span>
                  </div>
                ) : ( <div className="flex items-center gap-2 text-sm text-muted-foreground"><UserIcon className="h-4 w-4" /><span>미배정</span></div>)}
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-due-date-edit-dialog" className="text-xs font-semibold text-muted-foreground">마감일</Label>
                {isEditing ? (
                  <div 
                    className="relative cursor-pointer" 
                    onClick={() => dateInputRef.current?.showPicker()}
                  >
                    <Input
                      id="task-due-date-edit-dialog"
                      type="date"
                      name="dueDate"
                      value={editedTask.dueDate instanceof Date ? format(editedTask.dueDate, "yyyy-MM-dd") : editedTask.dueDate}
                      onChange={handleEditInputChange}
                      disabled={isSubmitting}
                      className="w-full max-w-[150px]"
                      ref={dateInputRef}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {currentTask.dueDate && currentTask.dueDate !== "" ? format(parseLocalDateString(currentTask.dueDate)!, "PPP", {locale: ko}) : "날짜 미정"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Separator className="my-6" />
            <TaskComments 
              isAdmin={false} 
              taskId={currentTask.id}
            />
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleEditTaskToggle} disabled={isSubmitting}>취소</Button>
              {canModify && (
              <Button onClick={handleSaveTask} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                변경사항 저장
              </Button>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={() => handleDialogClose(false)}>닫기</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

