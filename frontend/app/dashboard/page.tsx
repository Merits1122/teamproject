"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ListChecks, FolderOpen, AlertTriangle, Calendar as CalendarIcon, Loader2, ServerCrash } from "lucide-react";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInDays, isToday, addDays, compareAsc, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { apiCall } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Status, ApiProject, ProjectMember, ApiActivityLog } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRevalidateOnFocus } from "@/hooks/use-revalidate-on-focus"

interface FrontendProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  progress: number;
  tasksInfo: { total: number; completed: number };
  displayDueDate: string;
  membersToDisplay: ProjectMember[];
  membersCount: number;
  status: Status;
  displayStatus: string;
}

interface DashboardStats {
  totalProjects: number;
  activeTasks: number;
  teamMembers: number;
}

interface UpcomingDeadlineItem {
  id: string;
  taskTitle: string;
  projectName: string;
  projectId: number;
  dueDate: Date;
  displayDueDate: string; 
  isOverdue: boolean;
}

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};

const formatCommentTimestamp = (timestamp?: string): string => {
    if (!timestamp) return "방금 전";
    const date = parseISO(timestamp);
    if (differenceInSeconds(new Date(), date) < 60) {
        return "방금 전";
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};

const mapApiProjectToFrontendDashboard = (apiProject: ApiProject): FrontendProjectOnDashboard => {
  const completedTasks = apiProject.tasks?.filter(task => task.status === "DONE").length || 0;
  const totalTasks = apiProject.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let displayStatusText = "정보 없음";
  switch (apiProject.status) { 
    case "TODO": displayStatusText = "시작 전"; break;
    case "IN_PROGRESS": displayStatusText = "진행 중"; break;
    case "DONE": displayStatusText = "완료됨"; break;
  }

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    progress,
    tasksInfo: { total: totalTasks, completed: completedTasks },
    displayDueDate: apiProject.endDate ? format(parseISO(apiProject.endDate), "PP", { locale: ko }) : "날짜 미정",
    membersToDisplay: (apiProject.members || []).map(member => ({ ...member, initials: getInitials(member.name) })),
    membersCount: apiProject.members?.length || 0,               
    status: apiProject.status,
    displayStatus: displayStatusText
  };
};

const formatUpcomingDeadlineDisplay = (dueDate: Date): string => {
  const today = new Date(new Date().setHours(0,0,0,0)); 
  const targetDate = new Date(new Date(dueDate).setHours(0,0,0,0));
  const diff = differenceInDays(targetDate, today);

  if (diff < 0) return `기한 초과 (${format(dueDate, "M월 d일")})`;
  if (diff === 0) return `오늘 마감`;
  if (diff === 1) return `내일 마감`;
  if (diff <= 7) return `${diff}일 후 마감`;
  return `${format(dueDate, "M월 d일")} 마감`;
};


export default function DashboardPage() {
  const { toast } = useToast(); 
  const [projects, setProjects] = useState<FrontendProjectOnDashboard[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeTasks: 0,
    teamMembers: 0,
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<ApiActivityLog[]>([]);
  
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [projectsResponse, activitiesResponse] = await Promise.all([
        apiCall<ApiProject[]>('/api/projects'),
        apiCall<ApiActivityLog[]>('/api/dashboard/activitylog')
      ]);

    if (projectsResponse.success) {
      const apiProjects = projectsResponse.data;
      
      const sortedApiProjects = [...apiProjects].sort((a, b) => {
        const isADone = a.status === "DONE";
        const isBDone = b.status === "DONE";

        if (isADone && !isBDone) return 1;
        if (!isADone && isBDone) return -1;

        const dateA = a.endDate ? parseISO(a.endDate) : null;
        const dateB = b.endDate ? parseISO(b.endDate) : null;
        
        if (!dateA && !dateB) {
          return a.name.localeCompare(b.name);
        }
        if (!dateA) return 1; 
        if (!dateB) return -1;

        return compareAsc(dateA, dateB) || a.name.localeCompare(b.name);
      });
    
      const frontendProjects = sortedApiProjects.map(mapApiProjectToFrontendDashboard);
      setProjects(frontendProjects);

      const activeTasks = frontendProjects.reduce((acc, p) => acc + (p.tasksInfo.total - p.tasksInfo.completed), 0);
      const uniqueMembers = new Set(apiProjects.flatMap(p => p.members.map(m => m.email)));
      
      setDashboardStats({ 
        totalProjects: frontendProjects.length, 
        activeTasks, 
        teamMembers: uniqueMembers.size 
      });

      const allDeadlines: UpcomingDeadlineItem[] = apiProjects.flatMap(p => 
        (p.tasks || [])
          .filter(t => t.dueDate && t.status !== 'DONE')
          .map(t => ({...t, dueDateObj: parseISO(t.dueDate!)}))
          .filter(t => t.dueDateObj >= new Date(new Date().setHours(0,0,0,0)) && t.dueDateObj <= addDays(new Date(), 7))
          .map(t => ({
            id: `${p.id}-${t.id}`, taskTitle: t.title, projectName: p.name, projectId: p.id,
            dueDate: t.dueDateObj, displayDueDate: formatUpcomingDeadlineDisplay(t.dueDateObj),
            isOverdue: differenceInDays(t.dueDateObj, new Date()) < 0 && !isToday(t.dueDateObj)
          }))
      );
      setUpcomingDeadlines(allDeadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5));

    } else {
      console.error("대시보드: API 호출 실패:", projectsResponse.error);
      setError(projectsResponse.error.message);
    }

    if (activitiesResponse.success) {
      setRecentActivities(activitiesResponse.data);
    } else {
      console.warn("최근 활동 로드 실패:", activitiesResponse.error.message);
    }
    setIsLoading(false);
  }, [toast]);

  useRevalidateOnFocus(fetchDashboardData);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleProjectCreated = (newApiProject: ApiProject) => {
    const newUiProject = mapApiProjectToFrontendDashboard(newApiProject);
    setProjects(prevProjects => [newUiProject, ...prevProjects]);
    setDashboardStats(prev => ({ ...prev, totalProjects: prev.totalProjects + 1 }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">대시보드 데이터를 불러오는 중...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] p-4 text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">오류 발생</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchDashboardData()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">환영합니다! 현재 프로젝트 현황입니다.</p>
        </div>
        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 프로젝트</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">진행중인 업무</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.activeTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 팀 참여 인원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">모든 프로젝트의 멤버 참여 수 합계</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">
        내 프로젝트 
        <span className="text-sm font-normal text-muted-foreground">
          ({projects.length > 3 ? '최근 3개' : `${projects.length}개`})
        </span>
      </h2>
      {projects.length === 0 && !isLoading && (
         <div className="text-center py-10 border rounded-md">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-md font-medium text-foreground">진행중인 프로젝트가 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-1">새 프로젝트를 생성하여 시작해보세요!</p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 3).map((project) => (
          <Link href={`/dashboard/project/${project.id}`} key={project.id} passHref>
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="truncate text-base" title={project.name}>{project.name}</CardTitle>
                  <Badge
                    variant={
                        project.status === "DONE" ? "default" : 
                        project.status === "IN_PROGRESS" ? "secondary" : 
                        "outline"
                    }
                    className={`${project.status === "DONE" ? "bg-green-600 text-white" : ""} text-xs`}
                  >
                    {project.displayStatus}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 h-[40px] text-xs">{project.description || "설명이 없습니다."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>진행률</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" />
                    <span>{project.tasksInfo.completed}/{project.tasksInfo.total} 작업 완료</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{project.displayDueDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {projects.length > 3 && (
        <div className="text-center mt-2">
            <Link href="/dashboard/projects">
                <Button variant="ghost" size="sm">모든 프로젝트 보기 &rarr;</Button>
            </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activity.userAvatarUrl || undefined} />
                      <AvatarFallback>{getInitials(activity.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 text-sm">
                      <p dangerouslySetInnerHTML={{ __html: activity.message }} />
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Link href={`/dashboard/project/${activity.projectId}`} className="font-semibold hover:underline">
                          {activity.projectName}
                        </Link>
                        <span className="mx-1.5">•</span>
                        <span>
                          {formatCommentTimestamp(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">최근 활동이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">다가오는 마감</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted flex-shrink-0">
                    {deadline.isOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CalendarIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="space-y-1 text-sm">
                    <Link href={`/dashboard/project/${deadline.projectId}?task=${deadline.id.split('-')[1]}`} className="hover:underline">
                        <p className="font-medium">{deadline.taskTitle}</p>
                    </Link>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Link href={`/dashboard/project/${deadline.projectId}`} className="hover:underline">
                        <span>{deadline.projectName}</span>
                      </Link>
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                      <span className={`font-semibold ${deadline.isOverdue ? 'text-destructive' : 'text-primary'}`}>{deadline.displayDueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">다가오는 마감 업무가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}