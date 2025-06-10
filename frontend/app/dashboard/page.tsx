// frontend/app/dashboard/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ListChecks, ServerCrash, FolderOpen, AlertTriangle, Calendar as CalendarIcon } from "lucide-react"; // CalendarIcon으로 이름 변경 또는 Calendar 사용
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { getToken } from "@/lib/auth"
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInDays, isFuture, isToday, addDays, compareAsc } from "date-fns"; // 필요한 date-fns 함수 추가

// --- 타입 정의 시작 ---
interface TaskSummaryOnDashboard {
  id: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate?: string; // ISO 8601 형식 (예: "2024-12-31" 또는 "2024-12-31T15:00:00Z")
}

interface DashboardProjectMember {
  userId: number; // 멤버의 고유 ID
  email: string;  // 또는 다른 고유 식별자
}

interface ApiProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  membersCount: number;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  creatorUsername?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks: TaskSummaryOnDashboard[];
  members: DashboardProjectMember[];
}

interface FrontendProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  progress: number;
  tasksInfo: { total: number; completed: number };
  displayDueDate: string;
  membersCount: number;
  displayStatus: string; // ⬅️ 화면에 표시될 최종 상태 텍스트 (예: "진행 중")
  status: "TODO" | "IN_PROGRESS" | "DONE";
  creatorUsername?: string;
}

interface DashboardStats {
  totalProjects: number;
  activeTasks: number;
  teamMembers: number;
}

interface ActivityUser { name: string; avatar: string; initials: string; }
interface RecentActivityItem { id: number; user: ActivityUser; action: string; item: string; project: string; time: string;}

// 다가오는 마감일 아이템 타입 수정
interface UpcomingDeadlineItem {
  id: string; // projectId-taskId
  taskTitle: string;
  projectName: string;
  projectId: number;
  dueDate: Date;
  displayDueDate: string; // 예: "내일", "3일 후"
  isOverdue: boolean;
}
// --- 타입 정의 끝 ---

const mapApiProjectToFrontendDashboard = (apiProject: ApiProjectOnDashboard): FrontendProjectOnDashboard => {
  const completedTasks = apiProject.tasks?.filter(task => task.status === "DONE").length || 0;
  const totalTasks = apiProject.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;


  let displayStatusText = "정보 없음";
  switch (apiProject.status) { // 백엔드가 보내준 effectiveStatus 사용
    case "TODO": displayStatusText = "시작 전"; break;
    case "IN_PROGRESS": displayStatusText = "진행 중"; break;
    case "DONE": displayStatusText = "완료됨"; break;
  }

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    progress: progress,
    tasksInfo: { total: totalTasks, completed: completedTasks },
    displayDueDate: apiProject.endDate ? format(parseISO(apiProject.endDate), "PP", { locale: ko }) : "날짜 미정",
    membersCount: apiProject.members?.length || 0,
    displayStatus: displayStatusText,                  // ⬅️ 계산된 표시용 텍스트
    status: apiProject.status,      // ⬅️ 업무 기반으로 계산된 상태
    creatorUsername: apiProject.creatorUsername,
  };
};

const formatUpcomingDeadlineDisplay = (dueDate: Date): string => {
  const today = new Date(new Date().setHours(0,0,0,0)); // 오늘 날짜의 시작
  const targetDate = new Date(new Date(dueDate).setHours(0,0,0,0)); // 마감일의 시작
  const diff = differenceInDays(targetDate, today);

  if (diff < 0) return `기한 초과 (${format(dueDate, "M월 d일")})`;
  if (diff === 0) return `오늘 마감`;
  if (diff === 1) return `내일 마감`;
  if (diff <= 7) return `${diff}일 후 마감`;
  return `${format(dueDate, "M월 d일")} 마감`;
};


export default function DashboardPage() {
  const [projects, setProjects] = useState<FrontendProjectOnDashboard[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeTasks: 0,
    teamMembers: 0,
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recentActivityData: RecentActivityItem[] = [ /* ... 기존 목업 ... */ ];
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(recentActivityData);


  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    const token = getToken();

    if (!token) {
      setError("인증 토큰이 없습니다. 로그인해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "알 수 없는 서버 오류" }));
        throw new Error(errorData.message || `데이터 조회 실패 (상태: ${response.status})`);
      }

      const apiProjects: ApiProjectOnDashboard[] = await response.json();

      // 🔽 프로젝트 정렬 로직 수정
      const sortedApiProjects = [...apiProjects].sort((a, b) => {
        const isADone = a.status === "DONE";
        const isBDone = b.status === "DONE";

        // 1. 완료 여부로 1차 정렬 (완료된 것은 뒤로)
        if (isADone && !isBDone) return 1;
        if (!isADone && isBDone) return -1;

        // 2. 마감일로 2차 정렬 (둘 다 완료되었거나, 둘 다 완료되지 않은 경우에만 실행됨)
        const dateA = a.endDate ? parseISO(a.endDate) : null;
        const dateB = b.endDate ? parseISO(b.endDate) : null;
        
        if (dateA === null && dateB === null) {
            // 마감일이 둘 다 없으면 이름순 정렬
            return a.name.localeCompare(b.name);
        }
        if (dateA === null) return 1;  // 마감일 없는 것을 뒤로
        if (dateB === null) return -1; // 마감일 없는 것을 뒤로

        // 마감일이 빠른 순 (오름차순)으로 정렬
        const dateComparison = compareAsc(dateA, dateB);
        if (dateComparison === 0) {
            // 마감일이 같으면 이름순 정렬
            return a.name.localeCompare(b.name);
        }
        return dateComparison;
      });
      // 🔼 프로젝트 정렬 로직 끝
      
      const frontendProjects = sortedApiProjects.map(mapApiProjectToFrontendDashboard);
      setProjects(frontendProjects);

      const totalProjects = frontendProjects.length;
      const activeTasks = frontendProjects.reduce((acc, project) => acc + (project.tasksInfo.total - project.tasksInfo.completed), 0);
      const uniqueMemberIdentifiers = new Set<string>(); // 사용자 email 또는 id를 저장
      apiProjects.forEach(project => {
        project.members?.forEach(member => {
          // member 객체에 email 이나 userId 같은 고유 식별자가 있다고 가정
          if (member.email) { // 또는 member.userId.toString() 등 고유 식별자 사용
            uniqueMemberIdentifiers.add(member.email.toLowerCase()); // 소문자로 통일하여 중복 방지
          }
        });
      });
      const uniqueTeamMembersCount = uniqueMemberIdentifiers.size;
      
      setDashboardStats({
        totalProjects: totalProjects,
        activeTasks: activeTasks,
        teamMembers: uniqueMemberIdentifiers.size, // ⬅️ 업데이트
      });

      // --- 다가오는 마감일 처리 ---
      const allTasksForDeadlines: UpcomingDeadlineItem[] = [];
      const today = new Date(new Date().setHours(0,0,0,0));
      const sevenDaysFromToday = addDays(today, 7);

      apiProjects.forEach(project => {
        project.tasks?.forEach(task => {
          if (task.dueDate) {
            const dueDateObj = parseISO(task.dueDate); // ISO 문자열을 Date 객체로
            // 오늘부터 7일 이내의 마감일만 필터링 (이미 지난 것은 제외)
            if (dueDateObj >= today && dueDateObj <= sevenDaysFromToday) {
              allTasksForDeadlines.push({
                id: `${project.id}-${task.id}`,
                taskTitle: task.title,
                projectName: project.name,
                projectId: project.id,
                dueDate: dueDateObj,
                displayDueDate: formatUpcomingDeadlineDisplay(dueDateObj),
                isOverdue: differenceInDays(dueDateObj, today) < 0 && !isToday(dueDateObj) // 오늘 마감은 초과 아님
              });
            }
          }
        });
      });

      // 마감일 순으로 정렬하여 상위 3-5개 표시
      const sortedUpcomingDeadlines = allTasksForDeadlines
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5); // 예시로 5개만
      setUpcomingDeadlines(sortedUpcomingDeadlines);

    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.message || "대시보드 데이터를 가져오는 중 오류가 발생했습니다.");
      setProjects([]);
      setUpcomingDeadlines([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleProjectCreated = (newApiProject: ApiProjectOnDashboard) => {
      fetchDashboardData(); // 새 프로젝트 생성 후 전체 데이터 다시 로드
  };

  
  if (isLoading) { /* ... 로딩 UI ... */ }
  if (error) { /* ... 에러 UI ... */ }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">환영합니다! 현재 프로젝트 현황입니다.</p>
        </div>
        <CreateProjectDialog onProjectCreated={handleProjectCreated as (project: any) => void} />
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
            <CardTitle className="text-sm font-medium">총 팀 참여 인원</CardTitle> {/* 텍스트 변경 */}
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">모든 프로젝트의 멤버 참여 수 합계</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold tracking-tight">내 프로젝트 <span className="text-sm font-normal text-muted-foreground">({projects.length > 3 ? '최근 3개' : `${projects.length}개`})</span></h2>
      {projects.length === 0 && !isLoading && (
         <div className="text-center py-10 border rounded-md">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-md font-medium text-foreground">진행중인 프로젝트가 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-1">새 프로젝트를 생성하여 시작해보세요!</p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 3).map((project) => ( // 최근 3개만 표시
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
            <CardDescription className="text-xs">🚨 API 연동이 필요한 부분입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ... Recent Activity 목업 데이터 사용 ... */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">다가오는 마감</CardTitle>
            {/* <CardDescription className="text-xs">향후 7일 이내 마감 업무</CardDescription> */}
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted flex-shrink-0">
                    {deadline.isOverdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CalendarIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="space-y-0.5 text-sm">
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