"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { InviteTeamDialog } from "@/components/projects/invite-team-dialog";
import {
  TaskBoard,
} from "@/components/tasks/task-board";
import type { 
  TaskStatus, 
  TaskPriority, 
  ProjectRole, 
  ApiTaskResponse, 
  ProjectMember as ProjectMemberResponseDto, // 별칭 사용
  BoardTask, 
  Member as BoardMember 
} from "@/lib/types";
import {
  Calendar,
  Clock,
  ServerCrash,
  FolderKanban,
  Loader2,
  Edit3,
  Trash2,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// --- 타입 정의 시작 ---
type PageTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type PageTaskPriority = "LOW" | "MEDIUM" | "HIGH";
type PageProjectRole = "ADMIN" | "MEMBER" | "VIEWER";

interface ApiProjectDetail {
  id: number;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status: PageTaskStatus;
  creatorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks: ApiTaskResponse[];
  members: ProjectMemberResponseDto[];
  memberCount: number;
}

interface FrontendProjectDisplay {
  id: number;
  name: string;
  description: string;
  displayDueDate: string;
  progress: number;
  displayStatus: string;
  apiOriginalStatus: PageTaskStatus;
  tasksInfo: { total: number; completed: number };
  members: ProjectMemberResponseDto[];
  apiTasks: ApiTaskResponse[];
  createdAt?: string;
  creatorUsername?: string;
}

interface Activity {
  id: number;
  user: { name: string; avatar: string; initials: string };
  action: string;
  target?: "task" | "project" | "user";
  targetName: string;
  timestamp: string;
}

const mockActivitiesData: Activity[] = [
  { id: 201, user: { name: "김철수", avatar: "", initials: "김" }, action: "업무 생성:", target: "task", targetName: "로그인 기능 구현", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()},
  { id: 202, user: { name: "이영희", avatar: "", initials: "이" }, action: "댓글 작성:", target: "task", targetName: "메인 페이지 디자인", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()},
];
// --- 타입 정의 끝 ---

const getInitials = (name?: string | null): string => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return "U"; // 이름이 없을 경우 기본값 "User"
};

// 헬퍼 함수: YYYY-MM-DD 문자열을 로컬 시간대 기준으로 Date 객체로 변환
const parseLocalDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    try {
        // "YYYY-MM-DD" 형식을 "YYYY/MM/DD"로 바꿔서 로컬 시간대 자정으로 해석하도록 유도
        return new Date(dateString.replace(/-/g, '/'));
    } catch(e) {
        return null;
    }
};

const mapApiProjectToFrontendDisplay = (apiProject: ApiProjectDetail): FrontendProjectDisplay => {
  const completedTasksCount = apiProject.tasks?.filter((task) => task.status === "DONE").length || 0;
  const totalTasks = apiProject.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
  const endDate = parseLocalDateString(apiProject.endDate);
  let displayProjectStatus = "정보 없음";
  switch (apiProject.status) {
    case "TODO": displayProjectStatus = "시작 전"; break;
    case "IN_PROGRESS": displayProjectStatus = "진행 중"; break;
    case "DONE": displayProjectStatus = "완료됨"; break;
  }
  return {
    id: apiProject.id, name: apiProject.name, description: apiProject.description,
    displayDueDate: endDate ? format(endDate, "PPP", { locale: ko }) : "마감일 미정", // ⬅️ 수정
    progress: progress, displayStatus: displayProjectStatus, apiOriginalStatus: apiProject.status,
    tasksInfo: { total: totalTasks, completed: completedTasksCount },
    members: apiProject.members || [],
    apiTasks: apiProject.tasks || [],
    createdAt: apiProject.createdAt ? format(parseISO(apiProject.createdAt), "PPP", { locale: ko }) : "생성일 미정",
    creatorUsername: apiProject.creatorUsername,
  };
};

function mapApiTaskToBoardTask(apiTask: ApiTaskResponse, projectMembers: ProjectMemberResponseDto[]): BoardTask {
  let taskAssignee: BoardMember | null = null;
  const dueDate = parseLocalDateString(apiTask.dueDate);
  if (apiTask.assigneeId) {
    const memberDetail = projectMembers.find(m => m.userId === apiTask.assigneeId);
    if (memberDetail) {
      taskAssignee = {
        id: memberDetail.userId, name: memberDetail.name,
        avatar: memberDetail.avatarUrl || "",
        initials: getInitials(memberDetail.name),
      };
    } else if (apiTask.assigneeUsername) {
      taskAssignee = {
        id: apiTask.assigneeId, name: apiTask.assigneeUsername,
        avatar: "",
        initials: getInitials(apiTask.assigneeUsername),
      };
    }
  }

  return {
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description || "",
    status: apiTask.status as TaskStatus,
    priority: (apiTask.priority || "MEDIUM") as TaskPriority,
    dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined, //
    assignee: taskAssignee,
    comments: 0, // API 응답에 댓글 수가 있다면 apiTask.commentsCount 등으로 변경
    createdAt: apiTask.createdAt || new Date().toISOString(),
  };
}

const mapProjectMembersToBoardMembers = (apiMembers: ProjectMemberResponseDto[]): BoardMember[] => {
    return apiMembers.map(member => ({
        id: member.userId,
        name: member.name,
        avatar: member.avatarUrl || "", // always a string
        initials: getInitials(member.name),
    }));
};

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id ? String(params.id) : null;
  
  const [projectDisplayData, setProjectDisplayData] = useState<FrontendProjectDisplay | null>(null);
  const [tasksForBoard, setTasksForBoard] = useState<BoardTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>(mockActivitiesData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loggedInUserEmail, setLoggedInUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<PageProjectRole | null>(null);

  const isAdmin = currentUserRole === "ADMIN";
  const canModifyTasks = currentUserRole === 'ADMIN' || currentUserRole === 'MEMBER';

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userIdentifier = localStorage.getItem("app_user_identifier") || sessionStorage.getItem("app_user_identifier");
      setLoggedInUserEmail(userIdentifier);
    }
  }, []);

  const fetchProjectData = useCallback(async (showLoadingSpinner = true) => {
    if (!projectId || projectId === "0") { setError("유효하지 않은 프로젝트 ID입니다."); if (showLoadingSpinner) setIsLoading(false); return; }
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    const token = getToken();
    if (!token) { setError("인증 토큰이 없습니다. 로그인해주세요."); if (showLoadingSpinner) setIsLoading(false); return; }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 404) setError(`ID '${projectId}'에 해당하는 프로젝트를 찾을 수 없습니다.`);
        else if (response.status === 401 || response.status === 403) setError("프로젝트 정보를 가져올 권한이 없습니다.");
        else { const errorData = await response.json().catch(() => ({ message: "알 수 없는 서버 오류" })); throw new Error(errorData.message || `프로젝트 정보 조회 실패 (상태: ${response.status})`); }
        setProjectDisplayData(null); setTasksForBoard([]); return;
      }
      const apiProjectDetail: ApiProjectDetail = await response.json();
      const frontendData = mapApiProjectToFrontendDisplay(apiProjectDetail);
      setProjectDisplayData(frontendData);
      setTasksForBoard(apiProjectDetail.tasks.map(task => mapApiTaskToBoardTask(task, apiProjectDetail.members || [])));

      if (loggedInUserEmail && frontendData.members) {
        const currentUserMembership = frontendData.members.find(
          (m) => m.email.toLowerCase() === loggedInUserEmail.toLowerCase()
        );
        if (currentUserMembership) {
          setCurrentUserRole(currentUserMembership.role);
        } else if (frontendData.creatorUsername && frontendData.creatorUsername.toLowerCase() === loggedInUserEmail.toLowerCase()) {
            setCurrentUserRole("ADMIN");
        } else {
            setCurrentUserRole(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch project details:", err);
      setError(err.message || "프로젝트 정보를 가져오는 중 오류가 발생했습니다.");
      setProjectDisplayData(null); setTasksForBoard([]);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, [projectId, loggedInUserEmail, toast]);

  useEffect(() => {
    if (projectId) {
      fetchProjectData(true);
    } else {
      setIsLoading(false); setError("프로젝트 ID를 URL에서 가져올 수 없습니다.");
    }
  }, [projectId, fetchProjectData]);

  // 업무 생성 콜백 (CreateTaskDialog에서 API 호출 성공 후, 생성된 Task 객체를 전달받음)
  // CreatedTaskPayload 타입: { id: string | number; ... }
  const handleTaskCreated = (createdTaskData: any) => {
    // ⛔️ 이 함수 내에서는 API를 다시 호출하지 않습니다!
    if (!projectDisplayData) {
      toast({ title: "오류", description: "프로젝트 데이터가 로드되지 않아 업무를 추가할 수 없습니다.", variant: "destructive" });
      return;
    }
    // id가 string일 경우 number로 변환 시도
    const createdApiTask: ApiTaskResponse = {
      ...createdTaskData,
      id: typeof createdTaskData.id === "string" ? parseInt(createdTaskData.id, 10) : createdTaskData.id,
    };

    console.log("ProjectDetailPage: Task created event received. API Task object:", createdApiTask);

    const newBoardTask = mapApiTaskToBoardTask(createdApiTask, projectDisplayData.members || []);
    setTasksForBoard((prevTasks) => [...prevTasks, newBoardTask]);

    setProjectDisplayData((prevData) => {
        if (!prevData) return null;
        const newTotalTasks = prevData.tasksInfo.total + 1;
        const newCompletedTasks = prevData.tasksInfo.completed + (createdApiTask.status === "DONE" ? 1 : 0);
        const newProgress = newTotalTasks > 0 ? Math.round((newCompletedTasks / newTotalTasks) * 100) : 0;
        const updatedApiTasks = prevData.apiTasks ? [...prevData.apiTasks, createdApiTask] : [createdApiTask];
        return {
            ...prevData,
            tasksInfo: { total: newTotalTasks, completed: newCompletedTasks },
            progress: newProgress,
            apiTasks: updatedApiTasks
        };
    });
    
    const currentUserIdentifier = loggedInUserEmail || "Current User";
    const newActivity: Activity = { 
        id: Date.now(), 
        user: { name: currentUserIdentifier, avatar: "", initials: getInitials(currentUserIdentifier) }, 
        action: "업무 생성:", 
        target: "task", 
        targetName: newBoardTask.title, 
        timestamp: new Date().toISOString()
    };
    setActivities((prevActivities) => [newActivity, ...prevActivities]);
  };
  
  type UpdatedBoardTaskPayload = BoardTask;
  
  // 업무 수정 콜백 (TaskDetailDialog에서 API 호출 성공 후, 수정된 Task 객체를 전달받음)
  const handleTaskUpdate = (updatedApiTask: ApiTaskResponse) => {
    // ⛔️ 이 함수 내에서는 API를 다시 호출하지 않습니다!p
    if (!projectDisplayData) {
      toast({ title: "오류", description: "프로젝트 데이터가 올바르게 로드되지 않았습니다.", variant: "destructive" });
      return;
    }

    const updatedBoardTask = mapApiTaskToBoardTask(updatedApiTask, projectDisplayData.members);

    setTasksForBoard((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedBoardTask.id ? updatedBoardTask : task
      )
    );

    setProjectDisplayData((prevData) => {
      if (!prevData) return null;
      
      const newApiTasks = prevData.apiTasks.map((apiTask) =>
        apiTask.id === updatedApiTask.id ? updatedApiTask : apiTask
      );

      const completed = newApiTasks.filter(t => t.status === "DONE").length;
      const total = newApiTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return { 
        ...prevData, 
        apiTasks: newApiTasks,
        tasksInfo: { total, completed },
        progress 
      };
    });
  };

  const handleTaskDeleted = (deletedTaskId: number | string) => {
    // ⛔️ 이 함수는 예외를 던지지 않도록 안정적으로 작성합니다.
    if (!projectDisplayData) {
      return;
    }

    // 1. TaskBoard에 전달되는 tasksForBoard 상태 업데이트
    setTasksForBoard((prevTasks) =>
      prevTasks.filter((task) => task.id.toString() !== deletedTaskId.toString())
    );

    // 2. 전체 프로젝트 데이터(통계, 원본 업무 목록) 업데이트
    setProjectDisplayData((prevData) => {
      if (!prevData) return null;

      const newApiTasks = prevData.apiTasks.filter((task) => task.id.toString() !== deletedTaskId.toString());
      const completed = newApiTasks.filter(t => t.status === "DONE").length;
      const total = newApiTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
          ...prevData,
          apiTasks: newApiTasks,
          tasksInfo: { total, completed },
          progress
      };
    });
  };

  const handleMemberInvited = (invitedInfo: { email: string; role: PageProjectRole }) => {
    fetchProjectData(false);
    const currentUserIdentifier = loggedInUserEmail || "Current User";
    const newActivity: Activity = { id: Date.now(), user: { name: currentUserIdentifier, avatar: "", initials: getInitials(currentUserIdentifier) }, action: "멤버 초대:", target: "user", targetName: invitedInfo.email, timestamp: new Date().toISOString() };
    setActivities((prevActivities) => [newActivity, ...prevActivities]);
  };

  const handleChangeRoleApi = async (memberUserId: number, newRole: PageProjectRole) => {
    if (!projectId || !projectDisplayData || currentUserRole !== "ADMIN") { toast({ title: "권한 없음", description: "멤버 역할을 변경할 권한이 없습니다.", variant: "destructive" }); return; }
    const memberToChange = projectDisplayData.members.find(m => m.userId === memberUserId);
    if (!memberToChange) { toast({ title: "오류", description: "역할을 변경할 멤버를 찾을 수 없습니다.", variant: "destructive" }); return; }
    if (memberToChange.role === newRole) { toast({ title: "정보", description: "이미 해당 역할을 가지고 있습니다."}); return; }

    if (memberToChange.email.toLowerCase() === loggedInUserEmail?.toLowerCase() && newRole !== "ADMIN") {
        const adminCount = projectDisplayData.members.filter(m => m.role === "ADMIN").length;
        if (adminCount <= 1) { toast({ title: "역할 변경 불가", description: "프로젝트에는 최소 한 명의 ADMIN이 필요합니다.", variant: "destructive" }); return; }
    }
    if (newRole === "ADMIN" && memberToChange.role !== "ADMIN") {
        if(!confirm(`'${memberToChange.name}'님을 ADMIN으로 지정하시겠습니까? ADMIN은 프로젝트의 모든 권한을 갖게 됩니다.`)) return;
    }
    if (projectDisplayData.creatorUsername && memberToChange.email.toLowerCase() === projectDisplayData.creatorUsername.toLowerCase() && newRole !== "ADMIN") {
        toast({ title: "역할 변경 불가", description: "프로젝트 생성자의 역할은 ADMIN에서 변경할 수 없습니다.", variant: "destructive" }); return;
    }

    const token = getToken();
    if (!token) { toast({ title: "인증 오류", description: "로그인이 필요합니다.", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}/members/${memberUserId}/role`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ role: newRole })
        });
        if (!response.ok) { const errorData = await response.json().catch(() => ({ message: "역할 변경 실패" })); throw new Error(errorData.message); }
        toast({ title: "성공", description: `${memberToChange.name} 멤버의 역할이 ${newRole}(으)로 변경되었습니다.` });
        fetchProjectData(false);
    } catch (error: any) { toast({ title: "역할 변경 실패", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleRemoveMemberApi = async (memberUserId: number, memberName: string) => {
    if (!projectId || !projectDisplayData || currentUserRole !== "ADMIN") { toast({ title: "권한 없음", description: "멤버를 추방할 권한이 없습니다.", variant: "destructive" }); return; }
    const memberToRemove = projectDisplayData.members.find(m => m.userId === memberUserId);
    if (!memberToRemove) { toast({ title: "오류", description: "추방할 멤버를 찾을 수 없습니다.", variant: "destructive" }); return; }

    if (memberToRemove.email.toLowerCase() === loggedInUserEmail?.toLowerCase()) {
        const adminCount = projectDisplayData.members.filter(m => m.role === "ADMIN").length;
        if (adminCount <= 1) { toast({ title: "추방 불가", description: "프로젝트에는 최소 한 명의 ADMIN이 필요합니다. 자신을 추방할 수 없습니다.", variant: "destructive" }); return; }
    }
    if (projectDisplayData.creatorUsername && memberToRemove.email.toLowerCase() === projectDisplayData.creatorUsername.toLowerCase()) {
         toast({ title: "추방 불가", description: "프로젝트 생성자는 추방할 수 없습니다.", variant: "destructive" }); return;
    }

    const token = getToken();
    if (!token) { toast({ title: "인증 오류", description: "로그인이 필요합니다.", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects/${projectId}/members/${memberUserId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) { const errorData = await response.json().catch(() => ({ message: "멤버 추방 실패" })); throw new Error(errorData.message); }
        toast({ title: "성공", description: `'${memberName}' 멤버가 프로젝트에서 추방되었습니다.` });
        fetchProjectData(false);
    } catch (error: any) { toast({ title: "멤버 추방 실패", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) { return ( <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="flex flex-col items-center"><Loader2 className="animate-spin h-10 w-10 text-primary mb-4" /><p>프로젝트 정보 로딩 중...</p></div></div> ); }
  if (error) { return ( <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center"><ServerCrash className="w-16 h-16 text-destructive mb-4" /><h2 className="text-xl font-semibold text-destructive mb-2">오류</h2><p>{error}</p><Button onClick={() => fetchProjectData(true)}>다시 시도</Button></div> ); }
  if (!projectDisplayData) { return ( <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center"><FolderKanban className="w-16 h-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">프로젝트 없음</h2><p>정보를 찾을 수 없습니다.</p><Link href="/dashboard"><Button>목록으로</Button></Link></div> ); }

  const boardMembersForTaskBoard: BoardMember[] = projectDisplayData.members ? mapProjectMembersToBoardMembers(projectDisplayData.members) : [];
  

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl break-all">{projectDisplayData.name}</h1>
          <p className="text-muted-foreground line-clamp-3 md:line-clamp-none mt-1">{projectDisplayData.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-2 md:mt-0">
          {isAdmin && <InviteTeamDialog projectId={projectId!} onMemberInvited={handleMemberInvited} />}
          {isAdmin && <DeleteProjectDialog projectId={projectId!} projectName={projectDisplayData.name} onProjectDeleted={() => router.push("/dashboard")} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">진행률</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between mb-2"><span className="text-2xl font-bold">{projectDisplayData.progress}%</span><Badge variant={projectDisplayData.apiOriginalStatus === "DONE" ? "default" : projectDisplayData.apiOriginalStatus === "IN_PROGRESS" ? "secondary" : "outline"} className={`${projectDisplayData.apiOriginalStatus === "DONE" ? "bg-green-600 text-white" : ""} text-xs`}>{projectDisplayData.displayStatus}</Badge></div><Progress value={projectDisplayData.progress} className="h-2" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">업무 현황</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><div><span className="text-2xl font-bold">{projectDisplayData.tasksInfo.completed}</span><span className="text-muted-foreground">/{projectDisplayData.tasksInfo.total}</span></div><div className="text-right"><span className="text-sm font-medium">{(projectDisplayData.tasksInfo.total || 0) > 0 ? Math.round(((projectDisplayData.tasksInfo.completed || 0) / (projectDisplayData.tasksInfo.total || 1)) * 100) : 0}%</span><p className="text-xs text-muted-foreground">완료됨</p></div></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">마감일</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-muted-foreground" /><span>{projectDisplayData.displayDueDate}</span></div>{projectDisplayData.apiOriginalStatus !== "DONE" && projectDisplayData.displayDueDate !== "마감일 미정" && projectDisplayData.displayDueDate !== "날짜 미정" && parseISO(projectDisplayData.displayDueDate) < new Date(new Date().setHours(0,0,0,0)) && ( <Badge variant="destructive">기한 초과</Badge>)}{projectDisplayData.apiOriginalStatus !== "DONE" && projectDisplayData.displayDueDate !== "마감일 미정" && projectDisplayData.displayDueDate !== "날짜 미정" && parseISO(projectDisplayData.displayDueDate) >= new Date(new Date().setHours(0,0,0,0)) && ( <Badge variant="outline">진행 예정</Badge>)}</div>{projectDisplayData.createdAt && ( <p className="text-xs text-muted-foreground mt-2">생성일: {projectDisplayData.createdAt}</p> )}</CardContent></Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:max-w-sm">
          <TabsTrigger value="tasks">업무</TabsTrigger>
          <TabsTrigger value="team">팀 멤버</TabsTrigger>
          <TabsTrigger value="activity">활동내역</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <TaskBoard
            projectId={projectId!}
            initialTasks={tasksForBoard}
            members={boardMembersForTaskBoard}
            onTaskCreated={handleTaskCreated}
            onTaskUpdated={handleTaskUpdate}
            onTaskDeleted={handleTaskDeleted} // ⬅️ 함수 이름 일치 (handleTaskUpdateApi -> handleTaskUpdate)
            onTaskStatusChanged={function (taskId: string | number, newStatus: TaskStatus): Promise<void> | void {
              throw new Error("Function not implemented.");
            } }          
            canModifyTasks={canModifyTasks}
            />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>팀 멤버 ({projectDisplayData.members.length}명)</CardTitle>
                <CardDescription>이 프로젝트에 참여하고 있는 멤버 목록입니다.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {projectDisplayData.members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">참여 중인 멤버가 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {projectDisplayData.members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg -mx-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{member.name} 
                            {member.email.toLowerCase() === loggedInUserEmail?.toLowerCase() && 
                             <Badge variant="outline" className="ml-2 text-xs">나</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && 
                         member.email.toLowerCase() !== loggedInUserEmail?.toLowerCase() &&
                         member.email.toLowerCase() !== projectDisplayData.creatorUsername?.toLowerCase() &&
                        (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleChangeRoleApi(member.userId, newRole as PageProjectRole)}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-[120px] h-9 text-xs">
                              <SelectValue placeholder="역할" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">MEMBER</SelectItem>
                              <SelectItem value="VIEWER">VIEWER</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {(!isAdmin || member.email.toLowerCase() === loggedInUserEmail?.toLowerCase() || member.email.toLowerCase() === projectDisplayData.creatorUsername?.toLowerCase()) && (
                           <Badge variant={member.role === "ADMIN" ? "default" : "secondary"} className="text-xs capitalize min-w-[70px] justify-center h-9 px-3">
                             {member.role.toLowerCase()}
                           </Badge>
                        )}
                        
                        {isAdmin && 
                         member.email.toLowerCase() !== loggedInUserEmail?.toLowerCase() &&
                         member.email.toLowerCase() !== projectDisplayData.creatorUsername?.toLowerCase() &&
                        (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive/90" disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">멤버 추방</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>멤버 추방 확인</AlertDialogTitle><AlertDialogDescription>정말로 '{member.name}'님을 이 프로젝트에서 추방하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMemberApi(member.userId, member.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">추방</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader><CardTitle>최근 활동</CardTitle><CardDescription>🚨 API 연동이 필요한 부분입니다.</CardDescription></CardHeader>
            <CardContent><div className="space-y-4">{activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar || undefined} alt={activity.user.name} />
                      <AvatarFallback>{activity.user.initials}</AvatarFallback>
                      </Avatar>
                    <div className="space-y-1"><p className="text-sm"><span className="font-medium">{activity.user.name}</span> {activity.action}{" "}{activity.target && activity.target !== "project" && <span className="font-medium">{activity.targetName}</span>}{activity.target === "project" && <span className="font-medium">이 프로젝트</span>}</p><p className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{format(parseISO(activity.timestamp), "PPp", { locale: ko })}</p></div>
                  </div>))}
            </div></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Suspense Wrapper
export default function ProjectDetailPageContainer() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}