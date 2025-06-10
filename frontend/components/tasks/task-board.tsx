// frontend/components/tasks/task-board.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MessageSquare, Loader2 } from "lucide-react" // Loader2 추가
import { formatDistanceToNow, format as formatDate, startOfToday, endOfDay, isPast } from "date-fns"
import { ko } from 'date-fns/locale';

import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDetailDialog } from "./task-detail-dialog"
import { useToast } from "@/hooks/use-toast"
import type { Member, TaskStatus, TaskPriority, ApiTaskResponse } from "@/lib/types";
// --- 타입 정의 시작 ---

// ProjectDetailPage의 mapApiTaskToBoardTask가 이 타입으로 변환합니다.
export type Task = {
  id: number | string;
  title: string;
  description: string; // ⬅️ 필수 string으로 가정 (오류 메시지 기반)
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // "YYYY-MM-DD" 형식
  assignee: {
    id: number;
    name: string;
    avatar: string;
    initials: string;
  } | null;
  comments: number;
  createdAt: string; // ISO 문자열
};

// CreateTaskDialog가 onTaskCreated 콜백으로 전달할 데이터의 타입
// (백엔드 API가 업무 생성 후 반환하는 객체의 구조와 유사해야 함)
// ProjectDetailPage의 ApiTaskResponse 타입과 유사하게 정의할 수 있습니다.
export interface CreatedTaskPayload { // 이름 변경 및 명확화
  id: number | string;
  title: string;
  description?: string; // API 응답에서는 optional일 수 있음
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  // 백엔드 응답에 따른 다른 필드들
}

interface UpdatedTaskPayload {
  id: number | string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee: Member | null;
  comments: number;
  createdAt: string;
}

export interface TaskBoardProps {
  projectId: string;
  initialTasks?: Task[];
  members: Member[];
  // 🔽 onTaskCreated가 받는 타입을 CreatedTaskPayload로 변경
  onTaskCreated: (createdTaskData: CreatedTaskPayload) => Promise<void> | void;
  onTaskUpdated: (updatedApiTask: ApiTaskResponse) => Promise<void> | void;
  onTaskStatusChanged: (taskId: string | number, newStatus: TaskStatus) => Promise<void> | void;
  onTaskDeleted: (taskId: string | number) => Promise<void> | void; // ⬅️ onTaskDeleted prop 타입 명시
  canModifyTasks: boolean;
}
// --- 타입 정의 끝 ---

export function TaskBoard({
  projectId,
  initialTasks = [],
  members,
  onTaskCreated, // 이 onTaskCreated는 ProjectDetailPage의 handleTaskCreatedApi
  onTaskUpdated,
  onTaskStatusChanged,
  onTaskDeleted,
  canModifyTasks,
}: TaskBoardProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  // const [isSubmittingTask, setIsSubmittingTask] = useState(false); // TaskBoard 내 개별 작업 로딩 (선택)


  useEffect(() => {
    console.log("TaskBoard: initialTasks updated", initialTasks);
    setTasks(initialTasks);
  }, [initialTasks]);

  const todoTasks = tasks.filter((task) => task.status === "TODO");
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((task) => task.status === "DONE");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleTaskUpdatedFromDetail = async (updatedTaskFromDialog: ApiTaskResponse) => {
    // TaskDetailDialog에서 Task 객체 전체를 받음
    const dataToUpdate: Partial<Omit<Task, 'id' | 'status' | 'createdAt' | 'comments' | 'assignee'>> = {
        title: updatedTaskFromDialog.title,
        description: updatedTaskFromDialog.description,
        priority: updatedTaskFromDialog.priority,
        dueDate: updatedTaskFromDialog.dueDate,
    };
    // setIsSubmittingTask(true);
    try {
        await onTaskUpdated(updatedTaskFromDialog);
        // 성공 시 ProjectDetailPage에서 fetchProjectData가 호출되어 initialTasks가 업데이트되고,
        // 위의 useEffect에 의해 tasks 상태가 갱신됨.
    } catch (error) {
        // ProjectDetailPage의 onTaskUpdated에서 toast를 이미 처리했을 수 있음
        console.error("Error propogated from onTaskUpdated in TaskBoard:", error);
    } finally {
        // setIsSubmittingTask(false);
        setIsTaskDetailOpen(false);
    }
  };

  // 🔽 onTaskDeleted 핸들러를 TaskDetailDialog에서 직접 호출하지 않고, TaskBoard가 중간에서 처리
  //    이렇게 하면 TaskDetailDialog가 닫힌 후 selectedTask를 초기화할 수 있습니다.
  const handleTaskDeletedFromDetail = async (taskId: string | number) => {
      try {
          if(onTaskDeleted) {
            await onTaskDeleted(taskId); // 부모(ProjectDetailPage)의 삭제 로직 호출
          }
          setIsTaskDetailOpen(false); // 다이얼로그 닫기
      } catch (error) {
          console.error("Error from onTaskDeleted callback in TaskBoard:", error);
      }
  };


  useEffect(() => {
    // 다이얼로그가 닫히면 선택된 업무 초기화
    if (!isTaskDetailOpen) {
      setSelectedTask(null);
    }
  }, [isTaskDetailOpen]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number | string) => {
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    e.preventDefault();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold md:text-2xl">업무 보드</h2>
        {canModifyTasks && (
        <CreateTaskDialog
          projectId={projectId.toString()}
          members={members}
          onTaskCreated={onTaskCreated} // ⬅️ ProjectDetailPage의 handleTaskCreatedApi가 직접 전달됨
        />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* To Do Column */}
        <div className="space-y-4 p-2 bg-muted/40 rounded-lg">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="font-medium text-base">할 일 (TODO)</h3>
            <Badge variant="outline">{todoTasks.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px] p-1 rounded" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "TODO")}>
            {todoTasks.map((task) => (<TaskCard key={task.id.toString()} task={task} onDragStart={handleDragStart} onTaskClick={handleTaskClick} draggable={canModifyTasks} />))}
            {todoTasks.length === 0 && ( <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md"><p className="text-sm text-muted-foreground">업무 없음</p></div>)}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="space-y-4 p-2 bg-muted/40 rounded-lg">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="font-medium text-base">진행 중 (IN_PROGRESS)</h3>
            <Badge variant="outline">{inProgressTasks.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px] p-1 rounded" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "IN_PROGRESS")}>
            {inProgressTasks.map((task) => (<TaskCard key={task.id.toString()} task={task} onDragStart={handleDragStart} onTaskClick={handleTaskClick} draggable={canModifyTasks}/>))}
            {inProgressTasks.length === 0 && ( <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md"><p className="text-sm text-muted-foreground">업무 없음</p></div>)}
          </div>
        </div>

        {/* Done Column */}
        <div className="space-y-4 p-2 bg-muted/40 rounded-lg">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="font-medium text-base">완료됨 (DONE)</h3>
            <Badge variant="outline">{doneTasks.length}</Badge>
          </div>
          <div className="space-y-3 min-h-[200px] p-1 rounded" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "DONE")}>
            {doneTasks.map((task) => (<TaskCard key={task.id.toString()} task={task} onDragStart={handleDragStart} onTaskClick={handleTaskClick}draggable={canModifyTasks}/>))}
            {doneTasks.length === 0 && ( <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md"><p className="text-sm text-muted-foreground">업무 없음</p></div>)}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask} // ⬅️ 선택된 task를 직접 전달
          members={members}
          projectId={projectId.toString()}
          open={isTaskDetailOpen}
          onOpenChange={setIsTaskDetailOpen}
          onTaskUpdated={handleTaskUpdatedFromDetail}
          onTaskDeleted={handleTaskDeletedFromDetail} // ⬅️ 구현된 핸들러 전달
          canModify={canModifyTasks}
        />
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number | string) => void;
  onTaskClick: (task: Task) => void;
  draggable: boolean;
}

function TaskCard({ task, onDragStart, onTaskClick, draggable }: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const priorityDisplay: Record<TaskPriority, { text: string, className: string }> = {
    LOW: { text: "낮음", className: "bg-green-100 text-green-700 border-green-300" },
    MEDIUM: { text: "보통", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    HIGH: { text: "높음", className: "bg-red-100 text-red-700 border-red-300" },
  };

  const handlePointerDown = () => setIsDragging(false);
  const handlePointerMove = () => setIsDragging(true);
  const handlePointerUp = () => { if (!isDragging) onTaskClick(task); };

  // 🔽 마감일 관련 로직 추가
  let deadline: Date | null = null;
  if (task.dueDate) {
    try {
      // "YYYY-MM-DD"를 "YYYY/MM/DD"로 바꿔 로컬 시간으로 해석하고,
      // endOfDay를 사용해 해당 날짜의 가장 마지막 시간(23:59:59.999)으로 설정
      deadline = endOfDay(new Date(task.dueDate.replace(/-/g, '/')));
    } catch (error) {
      console.error("Invalid date format for dueDate:", task.dueDate, error);
    }
  }
  // isPast 함수를 사용하여 현재 시각이 마감일의 끝 시점을 지났는지 확인
  const isOverdue = deadline ? isPast(deadline) : false;
  
  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => { draggable && onDragStart(e, task.id); }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2 text-xs">
        {task.description && <p className="text-muted-foreground mb-2 line-clamp-3">{task.description}</p>}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${priorityDisplay[task.priority]?.className || ''}`}>
            우선순위: {priorityDisplay[task.priority]?.text || task.priority}
          </Badge>
          {/* 🔽 기한 초과 여부에 따라 다른 UI 표시 (로직은 동일, 변수만 변경) */}
          {isOverdue ? (
            <Badge variant="destructive" className="text-xs">기한 초과</Badge>
          ) : deadline ? ( // deadline 객체가 있을 때만 남은 기간 표시
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDistanceToNow(deadline, { addSuffix: true, locale: ko })}</span>
            </div>
          ) : null}
          {/* 🔼 마감일 표시 로직 끝 */}
        </div>
        <div className="flex items-center justify-between mt-3">
          {task.assignee ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar || undefined} />
              <AvatarFallback className="text-xs">{task.assignee.initials}</AvatarFallback>
            </Avatar>
          ) : ( <span className="text-xs text-muted-foreground">미배정</span> )}
          <div className="flex items-center gap-2">
            {task.comments !== undefined && task.comments > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}