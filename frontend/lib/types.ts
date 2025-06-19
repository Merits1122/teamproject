export type Status = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type ProjectRole = "ADMIN" | "MEMBER" | "VIEWER";

export interface ProjectMember {
  id: number;
  name: string; 
  email: string;
  role: ProjectRole;  
  avatarUrl?: string | null;
}

export interface ApiTask {
  id: number | string;
  title: string;
  description: string;
  dueDate?: string;
  status: Status;
  priority: TaskPriority;
  assignee: ProjectMember | null; 
  comments: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProject { 
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: Status; 
  creatorUsername?: string;
  createdAt: string;
  updatedAt?: string;
  tasks: ApiTask[];
  members: ProjectMember[];
}

export interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  introduce: string;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}
