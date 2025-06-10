"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation"; // 현재 코드에서는 직접 사용 안 함
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker"; // DatePicker 경로 확인
import { useToast } from "@/hooks/use-toast";
import { Calendar, Edit, Trash, Loader2, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid as isValidDate, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getToken } from "@/lib/auth"; // getToken 경로 확인
// 🔽 TaskBoard에서 export된 타입들을 정확히 임포트합니다.
import type { Task as BoardTaskType } from "./task-board";
import type { 
  TaskStatus, 
  TaskPriority, 
  ProjectRole, 
  ApiTaskResponse, 
  ProjectMember as ProjectMemberResponseDto,
  BoardTask, 
  Member
} from "@/lib/types";

// ApiTaskResponse 타입이 실제로 export되지 않는 경우, 아래와 같이 직접 정의하거나 올바른 경로에서 import하세요.
import { CardDescription } from "@/components/ui/card"; // CardDescription 경로 수정 가정 (shadcn/ui 기본)
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


// 이 다이얼로그 내부에서 사용하는 Task 타입 (BoardTaskType과 동일하게 사용)


export interface TaskDetailDialogProps {
  task: BoardTaskType;
  members: Member[];
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (updatedApiTask: ApiTaskResponse) => Promise<void> | void; 
  onTaskDeleted: (taskId: number | string) => Promise<void> | void;
  canModify: boolean;
}

const parseLocalDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
        // "YYYY-MM-DD" 형식을 "YYYY/MM/DD"로 바꿔서 로컬 시간대 자정으로 해석하도록 유도
        return new Date(dateString.replace(/-/g, '/'));
    } catch(e) {
        return null;
    }
};

export function TaskDetailDialog({
  task: initialTask,
  members,
  projectId, // API 호출에 사용될 수 있음 (현재는 currentTask.id로 업무 ID 사용)
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
  canModify,
}: TaskDetailDialogProps) {
  const { toast } = useToast();

  const [currentTask, setCurrentTask] = useState<BoardTaskType>(initialTask);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editedTask, setEditedTask] = useState({
    title: initialTask.title,
    description: initialTask.description || "",
    status: initialTask.status,
    priority: initialTask.priority,
    dueDate: initialTask.dueDate && isValidDate(parseISO(initialTask.dueDate)) ? parseISO(initialTask.dueDate) : new Date(),
    assigneeId: initialTask.assignee?.id?.toString() || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { // 다이얼로그가 닫힐 때
      setIsEditing(false); // 수정 모드 해제
    }
    // 다이얼로그가 열리거나 initialTask가 변경될 때 editedTask 상태를 동기화
    setEditedTask({
      title: initialTask.title,
      description: initialTask.description || "",
      status: initialTask.status,
      priority: initialTask.priority,
      dueDate: parseLocalDateString(initialTask.dueDate) || new Date(), // ⬅️ 수정
      assigneeId: initialTask.assignee?.id?.toString() || "",
    });
  }, [open, initialTask]); // open과 initialTask에 의존

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: "status" | "priority" | "assigneeId", value: string) => {
    if (name === "status") {
      setEditedTask((prev) => ({ ...prev, status: value as TaskStatus }));
    } else if (name === "priority") {
      setEditedTask((prev) => ({ ...prev, priority: value as TaskPriority }));
    } else if (name === "assigneeId") {
      setEditedTask((prev) => ({ ...prev, assigneeId: value === "none" ? "" : value }));
    }
  };

  const handleEditDateChange = (date: Date | undefined) => {
    setEditedTask((prev) => ({ ...prev, dueDate: date || new Date() })); // 날짜가 없으면 오늘 날짜로 (또는 null 처리)
  };

  const handleEditTaskToggle = () => setIsEditing(!isEditing);
  
  const handleSaveTask = async () => {
    if (!editedTask.title.trim()) {
      toast({ title: "오류", description: "업무 제목은 필수입니다.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const token = getToken();
    if (!token) {
      toast({ title: "인증 오류", description: "로그인이 필요합니다.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const selectedAssigneeMember = editedTask.assigneeId && editedTask.assigneeId !== ""
      ? members.find((m) => m.id.toString() === editedTask.assigneeId) || null
      : null;

    const taskUpdatePayload = {
      title: editedTask.title,
      description: editedTask.description,
      status: editedTask.status,
      priority: editedTask.priority,
      dueDate: editedTask.dueDate ? format(editedTask.dueDate, "yyyy-MM-dd") : null,
      assigneeId: selectedAssigneeMember ? selectedAssigneeMember.id : null,
      // 백엔드 TaskRequest DTO에 없는 필드 (예: comments, createdAt 등)는 여기서 보내지 않음
    };
    
    console.log("TaskDetailDialog: Sending task update payload:", JSON.stringify(taskUpdatePayload, null, 2));
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/tasks/${currentTask.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(taskUpdatePayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `업무 수정 중 오류 발생 (상태: ${response.status})` }));
        throw new Error(errorData.message);
      }

      const updatedTaskFromApi: ApiTaskResponse = await response.json(); // ⬅️ 백엔드 응답
      console.log("TaskDetailDialog: Received updated task from API:", updatedTaskFromApi);

      if (onTaskUpdated) {
        await onTaskUpdated(updatedTaskFromApi); // 부모에게 업데이트된 Task 객체 전체 전달
      }
      
      setIsEditing(false);

      toast({ title: "업무 수정됨", description: `"${updatedTaskFromApi.title}" 업무 정보가 성공적으로 업데이트되었습니다.` });
    } catch (error: any) {
      console.error("Failed to update task:", error);
      toast({ title: "업무 수정 실패", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (deleteConfirmText !== currentTask.title) {
      toast({ title: "확인 실패", description: "업무 제목을 정확히 입력해주세요.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const token = getToken();
    if (!token) { toast({ title: "인증 오류", description: "로그인이 필요합니다.", variant: "destructive" }); setIsSubmitting(false); return; }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/tasks/${currentTask.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` }}
      );

      if (!response.ok && response.status !== 204) { // 204 No Content도 성공으로 간주
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `업무 삭제 실패`);
      }

      toast({ title: "업무 삭제됨", description: `"${initialTask.title}" 업무가 삭제되었습니다.`});
      if (onTaskDeleted) {
        await onTaskDeleted(initialTask.id);
      }

    } catch (error: any) {
      toast({ title: "업무 삭제 실패", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  const handleDialogClose = (openState: boolean) => {
    if (!openState) {
      setIsEditing(false);
      setEditedTask({
            title: currentTask.title,
            description: currentTask.description || "",
            status: currentTask.status,
            priority: currentTask.priority,
            dueDate: currentTask.dueDate && isValidDate(parseISO(currentTask.dueDate)) ? parseISO(currentTask.dueDate) : new Date(),
            assigneeId: currentTask.assignee?.id?.toString() || "",
      });
    }
    onOpenChange(openState);
  };

  const priorityDisplayMap: Record<TaskPriority, { text: string, className: string }> = {
    LOW: { text: "낮음", className: "bg-green-100 text-green-700 border-green-300" },
    MEDIUM: { text: "보통", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    HIGH: { text: "높음", className: "bg-red-100 text-red-700 border-red-300" },
  };

  const statusDisplayMap: Record<TaskStatus, { text: string, className: string }> = {
    TODO: { text: "할 일", className: "bg-gray-100 text-gray-800 border-gray-300" },
    IN_PROGRESS: { text: "진행 중", className: "bg-blue-100 text-blue-800 border-blue-300" },
    DONE: { text: "완료됨", className: "bg-green-100 text-green-800 border-green-300" },
  };


  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pr-12 relative"> {/* relative 추가 */}
          {isEditing ? (
            <div className="space-y-1">
              <Label htmlFor="task-title-edit-dialog" className="sr-only">제목</Label>
              <Input
                id="task-title-edit-dialog" // ID 중복 방지
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
           {/* 수정/삭제 버튼 (isEditing 상태 아닐 때만 DialogHeader 내부 오른쪽 상단에 위치) */}
            {!isEditing && canModify &&(
                <div className="absolute top-0 right-0 flex items-center gap-2 pt-4 pr-4"> {/* 위치 조정 */}
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
                                id="confirm-delete-task-dialog" // ID 중복 방지
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
                id="task-description-edit-dialog" // ID 중복 방지
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
                  <Select value={editedTask.status} onValueChange={(value) => handleEditSelectChange("status", value as TaskStatus)} disabled={!canModify ||isSubmitting}>
                    <SelectTrigger id="task-status-edit-dialog"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">할 일 (TODO)</SelectItem>
                      <SelectItem value="IN_PROGRESS">진행 중 (IN_PROGRESS)</SelectItem>
                      <SelectItem value="DONE">완료됨 (DONE)</SelectItem>
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
                      <SelectItem value="LOW">낮음 (LOW)</SelectItem>
                      <SelectItem value="MEDIUM">보통 (MEDIUM)</SelectItem>
                      <SelectItem value="HIGH">높음 (HIGH)</SelectItem>
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
                ) : currentTask.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarImage src={currentTask.assignee.avatar} alt={currentTask.assignee.name} /><AvatarFallback>{currentTask.assignee.initials}</AvatarFallback></Avatar>
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
                      className="w-full max-w-[150px]" // ⬅️ 너비 조절 클래스 추가
                      ref={dateInputRef} // ⬅️ ref 연결
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