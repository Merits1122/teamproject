"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, CheckCircle, Search, ServerCrash, FolderOpen, Users } from "lucide-react"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ko } from 'date-fns/locale';
import { compareAsc, format, parseISO } from "date-fns";
import { Status, ApiProject, ProjectMember } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { apiCall } from "@/lib/api"

interface FrontendProjectOnDashboard {
  id: number;
  name: string;
  description: string;
  progress: number;
  tasksInfo: { total: number; completed: number };
  displayDueDate: string;
  membersToDisplay: ProjectMember[];
  totalMembersCount: number;
  status: Status;
  creatorUsername?: string;
  displayStatus: string;
}

const getInitials = (name?: string | null): string => {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
};


const mapApiProjectToFrontend = (apiProject: ApiProject): FrontendProjectOnDashboard => {
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
    totalMembersCount: apiProject.members?.length || 0,
    status: apiProject.status,
    displayStatus: displayStatusText,
  };
};

export default function ProjectsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projects, setProjects] = useState<FrontendProjectOnDashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await apiCall<ApiProject[]>('/api/projects');

    if (response.success) {
      const apiProjects = response.data;

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
      setProjects(sortedApiProjects.map(mapApiProjectToFrontend));
    } else {
      console.error("프로젝트 목록 조회 API 호출 실패:", response.error);
      setError(response.error.message);
      toast({ title: "오류", description: "프로젝트 목록을 가져올 수 없습니다.", variant: "destructive"});
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectCreated = (newProject: ApiProject) => {
    const newFrontendProject = mapApiProjectToFrontend(newProject);
    setProjects(prevProjects => [newFrontendProject, ...prevProjects]);
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
    return ( 
    <div className="flex justify-center items-center h-[calc(100vh-100px)]">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4">
          </circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <p className="text-muted-foreground">
          프로젝트 목록을 불러오는 중...
        </p>
      </div>
    </div>);
  }

  if (error) {
    return ( 
    <div className="flex flex-col justify-center items-center h-[calc(100vh-100px)] p-4 text-center">
      <ServerCrash className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-xl font-semibold text-destructive mb-2">
        오류 발생
      </h2>
      <p className="text-muted-foreground mb-4">
        {error}
      </p>
      <Button onClick={fetchProjects}>
        다시 시도
      </Button>
    </div>);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로젝트</h1>
          <p className="text-muted-foreground">모든 프로젝트를 관리하고 새 프로젝트를 생성하세요.</p>
        </div>
        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
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
                    {project.membersToDisplay.slice(0, 3).map((member) => ( 
                      <Avatar key={member.id} className="border-2 border-background h-7 w-7">
                        <AvatarImage src={member.avatarUrl || undefined} 
                        alt={member.name || "멤버"} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
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