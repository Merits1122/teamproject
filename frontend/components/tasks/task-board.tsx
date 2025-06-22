"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, MessageSquare, } from "lucide-react"
import { formatDistanceToNow, endOfDay, isPast, parseISO } from "date-fns"
import { ko } from 'date-fns/locale';
import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDetailDialog } from "./task-detail-dialog"
import { Status, ApiTask, TaskPriority, ProjectMember} from "@/lib/types";
import { useToast } from "@/hooks/use-toast"

interface TaskCardProps {
  task: ApiTask;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number | string) => void;
  onTaskClick: (task: ApiTask) => void;
  draggable: boolean;
}

export interface TaskBoardProps {
  projectId: string;
  initialTasks?: ApiTask[];
  members: ProjectMember[];
  onTaskCreated: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
  onTaskStatusChanged: (taskId: string | number, newStatus: Status) => Promise<void>;
  canModifyTasks: boolean;
  currentUserId: number;
  isAdmin?: boolean;
}

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};

export function TaskBoard({
  projectId,
  initialTasks = [],
  members,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskStatusChanged,
  canModifyTasks,
  currentUserId,
  isAdmin,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState<Status | null>(null);
  const { toast } = useToast();

  const todoTasks = initialTasks.filter((task) => task.status === "TODO");
  const inProgressTasks = initialTasks.filter((task) => task.status === "IN_PROGRESS");
  const doneTasks = initialTasks.filter((task) => task.status === "DONE");

  const handleTaskClick = (task: ApiTask) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleTaskUpdatedFromDetail = onTaskUpdated;
  const handleTaskDeletedFromDetail = onTaskDeleted;

  useEffect(() => {
    if (!isTaskDetailOpen) {
      setSelectedTask(null);
    }
  }, [isTaskDetailOpen]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number | string) => {
    if (!canModifyTasks) return;
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canModifyTasks) return;
    e.preventDefault();
  };

  const handleDragEnter = (status: Status) => {
    if (canModifyTasks) {
      setIsDraggingOver(status);
    }
  };

  const handleDragLeave = () => {
    setIsDraggingOver(null);
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, newStatus: Status) => {
    if (!canModifyTasks) return;
    e.preventDefault();
    setIsDraggingOver(null);
    const taskId = e.dataTransfer.getData("taskId");
    
    await onTaskStatusChanged(taskId, newStatus);
  }, [canModifyTasks, onTaskStatusChanged]);

  const renderTaskColumn = (title: string, columnTasks: ApiTask[], status: Status) => (
    <div className="space-y-4 p-2 bg-muted/40 rounded-lg">
      <div className="flex items-center justify-between px-2 pt-1">
        <h3 className="font-semibold text-base">{title}</h3>
        <Badge variant="secondary">{columnTasks.length}</Badge>
      </div>
      <div 
        className={`space-y-3 min-h-[1000px] p-1 rounded-md transition-colors duration-200 
                   ${isDraggingOver === status ? 'bg-primary/10' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
        onDragEnter={() => handleDragEnter(status)}
        onDragLeave={handleDragLeave}
      >
        {columnTasks.map((task) => 
          <TaskCard 
            key={task.id.toString()} 
            task={task} 
            onDragStart={handleDragStart} 
            onTaskClick={handleTaskClick} 
            draggable={canModifyTasks} 
          />
        )}
        {columnTasks.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            업무를 여기로 드래그하세요
          </div>
        )}
      </div>
    </div>
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold md:text-2xl">업무 보드</h2>
        {canModifyTasks && (
          <CreateTaskDialog 
          projectId={projectId} 
          members={members} 
          onTaskCreated={onTaskCreated} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {renderTaskColumn("할 일", todoTasks, "TODO")}
        {renderTaskColumn("진행 중", inProgressTasks, "IN_PROGRESS")}
        {renderTaskColumn("완료됨", doneTasks, "DONE")}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          members={members}
          projectId={projectId}
          open={isTaskDetailOpen}
          onOpenChange={setIsTaskDetailOpen}
          onTaskUpdated={handleTaskUpdatedFromDetail}
          onTaskDeleted={handleTaskDeletedFromDetail}
          canModify={canModifyTasks}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onDragStart, onTaskClick, draggable }: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const priorityDisplay: Record<TaskPriority, { text: string; className: string }> = {
    LOW: { text: "낮음", className: "bg-green-100 text-green-700 border-green-300" },
    MEDIUM: { text: "보통", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    HIGH: { text: "높음", className: "bg-red-100 text-red-700 border-red-300" },
  };

  const handlePointerDown = () => setIsDragging(false);
  const handlePointerMove = () => setIsDragging(true);
  const handlePointerUp = () => {
    if (!isDragging) {
      onTaskClick(task);
    }
  };

  const deadline = task.dueDate ? endOfDay(parseISO(task.dueDate)) : null;
  const isOverdue = deadline ? isPast(deadline) : false;

  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => draggable && onDragStart(e, task.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing bg-card"
    >
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2 text-xs">
        {task.description && <p className="text-muted-foreground mb-2 line-clamp-3">{task.description}</p>}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${priorityDisplay[task.priority]?.className || ''}`}>
            {priorityDisplay[task.priority]?.text || task.priority}
          </Badge>
          {isOverdue ? (
            <Badge variant="destructive" className="text-xs">기한 초과</Badge>
          ) : deadline ? (
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDistanceToNow(deadline, { addSuffix: true, locale: ko })}</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between mt-3">
          {task.assignee?.id ? (
            <Avatar className="h-6 w-6" title={task.assignee.name}>
              <AvatarImage src={task.assignee.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
          ) : ( <span className="text-xs text-muted-foreground">미배정</span> )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{task.comments || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
