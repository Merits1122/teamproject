"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { InviteTeamDialog } from "@/components/projects/invite-team-dialog";
import { TaskBoard } from "@/components/tasks/task-board";
import { Status, ApiProject, ApiTask, ProjectRole } from "@/lib/types";
import { Calendar, Clock, ServerCrash, FolderKanban, Loader2, Trash2, CheckCircle } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api";

interface Activity {
  id: number;
  user: { name: string; avatar: string; initials: string };
  action: string;
  target?: "task" | "project" | "user";
  targetName: string;
  timestamp: string;
}

const mockActivitiesData: Activity[] = [
];

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<ApiProject | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>(mockActivitiesData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userIdentifier = localStorage.getItem("app_user_identifier") || sessionStorage.getItem("app_user_identifier");
      setLoggedInUserEmail(userIdentifier);
    }
  }, []);

  const fetchProjectData = useCallback(async (showLoadingSpinner = true) => {
    if (!projectId) { return; }
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    
    const response = await apiCall<ApiProject>(`/api/projects/${projectId}`);

    if (response.success) {
    setProject(response.data);
    setTasks(response.data.tasks || []);
  } else {
    setError(response.error.message);
  }
    if (showLoadingSpinner) setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchProjectData();
  }, [projectId, fetchProjectData]);

  const updateProjectStats = (newTasks: ApiTask[]) => {
    setProject(prev => {
      if (!prev) 
        return null;
      const completed = newTasks.filter(t => t.status === "DONE").length;
      const total = newTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...prev, tasks: newTasks, progress };
    });
    setTasks(newTasks);
  };

  const handleTaskCreated = (createdTask: ApiTask) => {
    const newTasks = [...tasks, createdTask];
    console.log("업무 생성 콜백 수신 | API 업무 객체:", createdTask);
    updateProjectStats(newTasks);
  };

  const handleTaskUpdated = (updatedTask: ApiTask) => {
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    updateProjectStats(newTasks);
  };
  
  const handleTaskDeleted = (deletedTaskId: number | string) => {
    const newTasks = tasks.filter(t => t.id !== deletedTaskId);
    updateProjectStats(newTasks);
  };
  
  const handleTaskStatusChange = async (taskId: string | number, newStatus: Status) => {
    const originalTasks = project?.tasks || [];
    console.log(`프로젝트 페이지: 업무 상태 변경 API 호출 | 업무 ID: ${taskId}, 새 상태: ${newStatus}`);
    
    setProject(prev => {
      if (!prev) return null;
      return { 
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t) 
      };
    });

    const response = await apiCall(`/api/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.success) {
      toast({ 
        title: "상태 변경됨", 
        description: "업무 상태가 성공적으로 변경되었습니다." 
      });
      fetchProjectData(false);
    } else {
      toast({
        title: "상태 변경 실패",
        description: response.error.message,
        variant: "destructive"
      });
      setProject(prev => prev ? ({ ...prev, tasks: originalTasks }) : null);
      throw new Error("상태 변경 실패");
    }
  };

  const handleMemberInvited = (invitedInfo: { email: string; role: ProjectRole }) => {
    fetchProjectData(false);
    const currentUserIdentifier = loggedInUserEmail || "Current User";
    const newActivity: Activity = { 
      id: Date.now(), 
      user: { name: currentUserIdentifier, avatar: "", initials: getInitials(currentUserIdentifier) },
      action: "멤버 초대:",
      target: "user", 
      targetName: invitedInfo.email,
      timestamp: new Date().toISOString() };
    setActivities((prevActivities) => [newActivity, ...prevActivities]);
  };

  const handleChangeRole = async (memberId: number, newRole: ProjectRole) => {
    setIsSubmitting(true);
    const response = await apiCall(`/api/projects/${projectId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    if (response.success) {
      toast({ 
        title: "성공", 
        description: "멤버 역할이 성공적으로 변경되었습니다." 
      });
      fetchProjectData(false);
    } else {
      toast({ 
        title: "역할 변경 실패",
        description: response.error.message, 
        variant: "destructive" 
      });
    }
    setIsSubmitting(false);
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    setIsSubmitting(true);
    const response = await apiCall(`/api/projects/${projectId}/members/${memberId}`, { 
      method: 'DELETE' 
    });

    if (response.success) {
      toast({ 
        title: "성공", 
        description: `'${memberName}' 멤버가 프로젝트에서 삭제되었습니다.` 
      });
      fetchProjectData(false);
    } else {
      toast({ 
        title: "멤버 삭제 실패", 
        description: response.error.message, 
        variant: "destructive" 
      });
    }
    setIsSubmitting(false);
  };

  if (isLoading) { 
    return ( 
    <div className="flex justify-center items-center h-[calc(100vh-100px)]">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
        <p>프로젝트 정보 로딩 중...</p>
      </div>
    </div> 
    ); 
  }
  if (error) { 
    return ( 
    <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center">
      <ServerCrash className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-xl font-semibold text-destructive mb-2">
        오류
      </h2>
      <p>
        {error}
      </p>
      <Button onClick={() => fetchProjectData(true)}>
        다시 시도
      </Button>
    </div> 
    ); 
  }
  if (!project) { 
    return ( 
    <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center">
      <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">
        프로젝트 없음
      </h2>
      <p>
        정보를 찾을 수 없습니다.
      </p>
      <Link href="/dashboard">
      <Button>
        목록으로
      </Button>
      </Link>
    </div> 
    );
  }
  console.log("렌더링 직전 project 상태 객체:", project);
  
  const currentUserRole = project.members.find(m => m.email.toLowerCase() === loggedInUserEmail?.toLowerCase())?.role || null;
  const isAdmin = currentUserRole === "ADMIN";
  const canModifyTasks = currentUserRole === 'ADMIN' || currentUserRole === 'MEMBER';
  const completedTasksCount = project.tasks.filter(t => t.status === "DONE").length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
  const displayDueDate = project.endDate ? format(parseISO(project.endDate), "PPP", { locale: ko }) : "마감일 미정";
  const displayStartDate = project.startDate ? format(parseISO(project.startDate), "PPP", { locale: ko }) : "시작일 미정";

  let displayProjectStatus: string;
  switch (project.status) {
    case "TODO": displayProjectStatus = "시작 전"; break;
    case "IN_PROGRESS": displayProjectStatus = "진행 중"; break;
    case "DONE": displayProjectStatus = "완료됨"; break;
    default: displayProjectStatus = "알 수 없음";
  }
  
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl break-all">{project.name}</h1>
          <p className="text-muted-foreground line-clamp-3 md:line-clamp-none mt-1">{project.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-2 md:mt-0">
          {isAdmin && <InviteTeamDialog projectId={projectId!} onMemberInvited={handleMemberInvited} />}
          {isAdmin && <DeleteProjectDialog projectId={projectId!} projectName={project.name} onProjectDeleted={() => router.push("/dashboard")} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {progress}%
              </span>
              <Badge variant={
                project.status === "DONE" ? "default" : project.status === "IN_PROGRESS" ? "secondary" : "outline"
              } className={
                `${project.status === "DONE" ? "bg-green-600 text-white" : ""} text-xs`}>
                {displayProjectStatus}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              업무 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 mr-2 "/>
                  {completedTasksCount}/{totalTasks} 완료
                </div>
            </div>
            </CardContent>
          </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              프로젝트 기간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground w-16">시작일:</span>
                <span>{displayStartDate}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground w-16">마감일:</span>
                <div className="flex items-center justify-between flex-grow">
                  <span>{displayDueDate}</span>
                  {project.status !== "DONE" && project.endDate && isPast(parseISO(project.endDate)) && (
                  <Badge variant="destructive">
                    기한 초과
                  </Badge>
                  )}
                  {project.status !== "DONE" && displayDueDate !== "마감일 미정" && displayDueDate !== "날짜 미정" && parseISO(displayDueDate) >= new Date(new Date().setHours(0,0,0,0)) && ( 
                  <Badge variant="outline">
                    진행 예정
                  </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
            initialTasks={tasks}
            members={project.members}
            onTaskCreated={handleTaskCreated}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
            onTaskStatusChanged={handleTaskStatusChange}      
            canModifyTasks={canModifyTasks}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>팀 멤버 ({project.members.length}명)</CardTitle>
                <CardDescription>이 프로젝트에 참여하고 있는 멤버 목록입니다.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">참여 중인 멤버가 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {project.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg -mx-3">
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
                         member.email.toLowerCase() !== project.creatorUsername?.toLowerCase() &&
                        (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleChangeRole(member.id, newRole as ProjectRole)}
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
                        {(!isAdmin || member.email.toLowerCase() === loggedInUserEmail?.toLowerCase() || member.email.toLowerCase() === project.creatorUsername?.toLowerCase()) && (
                           <Badge variant={member.role === "ADMIN" ? "default" : "secondary"} className="text-xs capitalize min-w-[70px] justify-center h-9 px-3">
                             {member.role.toLowerCase()}
                           </Badge>
                        )}
                        
                        {isAdmin && 
                         member.email.toLowerCase() !== loggedInUserEmail?.toLowerCase() &&
                         member.email.toLowerCase() !== project.creatorUsername?.toLowerCase() &&
                        (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive/90" disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">멤버 추방</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>멤버 추방 확인</AlertDialogTitle>
                                <AlertDialogDescription>정말로 '{member.name}'님을 이 프로젝트에서 추방하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(member.id, member.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">추방</AlertDialogAction>
                              </AlertDialogFooter>
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
            <CardHeader><CardTitle>최근 활동</CardTitle><CardDescription> API 연동 필요</CardDescription></CardHeader>
            <CardContent><div className="space-y-4">{activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user.avatar || undefined} alt={activity.user.name} />
                  <AvatarFallback>{activity.user.initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.user.name}
                    </span> 
                    {activity.action}{" "}{activity.target && activity.target !== "project" && <span className="font-medium">{activity.targetName}
                    </span>}
                    {activity.target === "project" && <span className="font-medium">이 프로젝트</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(parseISO(activity.timestamp), "PPp", { locale: ko })}
                  </p>
                </div>
              </div>))}
            </div></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProjectDetailPageContainer() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}