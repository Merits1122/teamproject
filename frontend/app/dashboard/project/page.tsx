"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Calendar, CheckCircle, Search, ServerCrash, FolderOpen, Users } from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog" // 경로 확인
import { getToken } from "@/lib/auth" // auth.ts 경로 확인
import { ko } from 'date-fns/locale';
import { compareAsc, format, parseISO } from "date-fns";

// --- 타입 정의 시작 ---
interface TaskSummaryOnPage {
  id: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE"; // 백엔드 Task의 status와 일치 (대문자)
  dueDate?: string;
}

interface DashboardProjectMemberInfo { // 프로젝트 목록 카드에 표시할 멤버 요약 정보
  userId: number;
  name: string; // 또는 initials
  avatarUrl?: string | null;
  initials?: string; // 추가: 멤버 이니셜
}

interface ApiProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  // membersCount: number; // 이 필드 대신 아래 members 배열의 길이를 사용할 수 있음
  status: "TODO" | "IN_PROGRESS" | "DONE";
  creatorUsername?: string; // 프로젝트 생성자 (폴백 아바타 등에 활용 가능)
  createdAt?: string;
  updatedAt?: string;
  tasks: TaskSummaryOnPage[];
  members: DashboardProjectMemberInfo[]; // ⬅️ 각 프로젝트의 (요약된) 멤버 목록
}

interface FrontendProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  progress: number;
  tasksInfo: { total: number; completed: number };
  displayDueDate: string;
  membersToDisplay: DashboardProjectMemberInfo[]; // UI에 표시할 멤버 목록
  totalMembersCount: number; // 프로젝트의 전체 멤버 수 (membersToDisplay.length와 다를 수 있음 - API에서 제공)
  status: "TODO" | "IN_PROGRESS" | "DONE";
  creatorUsername?: string;
  displayStatus: string; // 추가: 프로젝트 상태의 한글 표시 등
}
// --- 타입 정의 끝 ---

// 🔽 getInitials 함수 수정: 이름의 첫 글자만 반환하도록
const getInitials = (name?: string | null): string => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return "U"; // 이름이 없을 경우 기본값 "User"
};

// API 응답을 프론트엔드용 데이터로 변환하는 함수
const mapApiProjectToFrontend = (apiProject: ApiProjectOnDashboard): FrontendProjectOnDashboard => {
  const completedTasks = apiProject.tasks?.filter(task => task.status === "DONE").length || 0;
  const totalTasks = apiProject.tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let displayStatusText = "정보 없음";
  switch (apiProject.status) {
    case "TODO": displayStatusText = "시작 전"; break;
    case "IN_PROGRESS": displayStatusText = "진행 중"; break;
    case "DONE": displayStatusText = "완료됨"; break;
  }

  const membersForDisplay = (apiProject.members || []).map(member => ({
      ...member,
      initials: getInitials(member.name) // 이니셜 생성
  }));

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    progress: progress,
    tasksInfo: { total: totalTasks, completed: completedTasks },
    displayDueDate: apiProject.endDate ? format(parseISO(apiProject.endDate), "PP", { locale: ko }) : "날짜 미정",
    membersToDisplay: membersForDisplay, // ⬅️ API에서 받은 멤버 목록 사용
    totalMembersCount: apiProject.members?.length || 0, // ⬅️ members 배열 길이로 전체 멤버 수 설정
    status: apiProject.status,
    displayStatus: displayStatusText, // 이 필드가 FrontendProjectOnDashboard에 없다면 추가 또는 displayStatusText를 직접 사용
    creatorUsername: apiProject.creatorUsername,
  };
};

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projects, setProjects] = useState<FrontendProjectOnDashboard[]>([]) // 초기값을 빈 배열로
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    const token = getToken();

    if (!token) {
      setError("인증 토큰이 없습니다. 로그인해주세요.");
      setIsLoading(false);
      // 예: import { useRouter } from "next/navigation";
      // const router = useRouter(); router.push("/login");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/projects`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("프로젝트 목록을 가져올 권한이 없습니다. 다시 로그인해주세요.");
        } else {
          const errorData = await response.json().catch(() => ({ message: "알 수 없는 서버 오류" }));
          throw new Error(errorData.message || `프로젝트 목록 조회 실패 (상태: ${response.status})`);
        }
        setProjects([]); // 오류 시 빈 배열로 확실히 초기화
        return;
      }

      const apiProjects: ApiProjectOnDashboard[] = await response.json();
      // 🔽 프로젝트 정렬 로직
      const sortedApiProjects = [...apiProjects].sort((a, b) => {
        // 백엔드에서 effectiveStatus를 계산해서 보내주므로, 프론트에서는 그 값을 사용
        // 만약 mapApiProjectToFrontend를 먼저 실행해야 한다면, 그 결과를 정렬
        const statusA = a.status; // 또는 계산된 effectiveStatus가 있다면 사용
        const statusB = b.status;
        const isADone = statusA === "DONE";
        const isBDone = statusB === "DONE";

        if (isADone && !isBDone) return 1;
        if (!isADone && isBDone) return -1;
        
        const dateA = a.endDate ? parseISO(a.endDate) : null;
        const dateB = b.endDate ? parseISO(b.endDate) : null;
        
        if (dateA === null && dateB === null) return a.name.localeCompare(b.name);
        if (dateA === null) return 1;
        if (dateB === null) return -1;

        return compareAsc(dateA, dateB);
      });

      // 정렬된 배열을 사용하여 프론트엔드용 데이터로 변환
      setProjects(sortedApiProjects.map(mapApiProjectToFrontend));
      
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
      setError(err.message || "프로젝트 목록을 가져오는 중 오류가 발생했습니다.");
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []); // 컴포넌트 마운트 시 1회 실행

  const handleProjectCreated = (newApiProject: ApiProjectOnDashboard) => { // 타입 일치
    const newFrontendProject = mapApiProjectToFrontend(newApiProject);
    setProjects((prevProjects) => {
      const existingProjectIndex = prevProjects.findIndex(p => p.id === newFrontendProject.id);
      if (existingProjectIndex > -1) {
        const updatedProjects = [...prevProjects];
        updatedProjects[existingProjectIndex] = newFrontendProject;
        return updatedProjects;
      }
      return [newFrontendProject, ...prevProjects];
    });
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      project.status === statusFilter; 

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return ( /* 로딩 UI */ <div className="flex justify-center items-center h-[calc(100vh-100px)]"><div className="flex flex-col items-center"><svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="text-muted-foreground">프로젝트 목록을 불러오는 중...</p></div></div>);
  }

  if (error) {
    return ( /* 에러 UI */ <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center"><ServerCrash className="w-16 h-16 text-destructive mb-4" /><h2 className="text-xl font-semibold text-destructive mb-2">오류 발생</h2><p className="text-muted-foreground mb-4">{error}</p><Button onClick={fetchProjects}>다시 시도</Button></div>);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로젝트</h1>
          <p className="text-muted-foreground">모든 프로젝트를 관리하고 새 프로젝트를 생성하세요.</p>
        </div>
        <CreateProjectDialog onProjectCreated={handleProjectCreated as (project: any) => void} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="project-search-list"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태별 필터링" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="TODO">시작 전 (TODO)</SelectItem>
              <SelectItem value="IN_PROGRESS">진행 중 (IN_PROGRESS)</SelectItem>
              <SelectItem value="DONE">완료됨 (DONE)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProjects.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">표시할 프로젝트가 없습니다.</h3>
          <p className="text-sm text-muted-foreground">첫 번째 프로젝트를 생성해보세요!</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Link href={`/dashboard/project/${project.id}`} key={project.id} passHref>
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate" title={project.name}>{project.name}</CardTitle>
                  <Badge
                    variant={
                      project.status === "DONE" ? "default" :
                      project.status === "IN_PROGRESS" ? "secondary" : "outline"
                    }
                    className={`${project.status === "DONE" ? "bg-green-600 text-white" : ""} text-xs`}
                  >
                    {project.displayStatus}
                  </Badge>
                </div>
                <CardDescription className="text-sm line-clamp-2 h-[40px]">{project.description || "설명이 없습니다."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>진행률</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2"/>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>
                      {project.tasksInfo.completed}/{project.tasksInfo.total} 작업 완료
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{project.displayDueDate}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex items-center justify-between w-full">
                  <div className="flex -space-x-2 overflow-hidden">
                    {/* 🔽 실제 멤버 아바타 표시 */}
                    {project.membersToDisplay.slice(0, 3).map((member) => ( // 최대 3명 표시
                      <Avatar key={member.userId} className="border-2 border-background h-7 w-7">
                        <AvatarImage src={member.avatarUrl || undefined} alt={member.name || "멤버"} />
                        {/* 🔽 수정된 getInitials 함수로 생성된 initials 사용 */}
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    {project.totalMembersCount > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                        +{project.totalMembersCount - 3}
                      </div>
                    )}
                    {project.totalMembersCount === 0 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                            <Users className="h-3.5 w-3.5 text-muted-foreground"/>
                        </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">
                    프로젝트 보기
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}