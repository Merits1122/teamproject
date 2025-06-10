// types/index.ts (새 파일)

// 공용 상태 및 역할 타입
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type ProjectRole = "ADMIN" | "MEMBER" | "VIEWER";

// 멤버 정보 타입
export interface Member {
  id: number;
  name: string;
  avatar: string; // 아바타 URL
  initials: string; // 이름 이니셜
}

// 백엔드 API가 반환하는 Task의 기본 구조
export interface ApiTaskResponse {
  id: number;
  title: string;
  status: TaskStatus;
  dueDate?: string;
  description?: string;
  priority?: TaskPriority;
  createdAt?: string;
  assigneeId?: number | null;
  assigneeUsername?: string | null;
  // 백엔드 응답에 따른 다른 필드 추가 가능
}

// TaskBoard 및 그 하위 컴포넌트(TaskCard, TaskDetailDialog 등)가 사용하는 Task 객체 타입
export interface BoardTask {
  id: number | string; // id는 string일 수도 있음 (예: 임시 생성 시)
  title: string;
  description: string; // 항상 string (optional이 아님)
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee: Member | null;
  comments: number;
  createdAt: string;
}

// ProjectDetailPage에서 사용하는 프로젝트 멤버 타입 (BoardMember와 유사)
export interface ProjectMember extends Member {
    userId: number; // Member.id와 동일
    email: string;
    role: ProjectRole;
    avatarUrl?: string | null; // Member.avatar와 동일
}