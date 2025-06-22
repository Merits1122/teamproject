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
  provider: 'LOCAL' | 'GOOGLE';
  introduce: string;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
}

export interface ApiComment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ApiActivityLog {
  id: number;
  message: string;
  type: string;
  createdAt: string;
  userId: number;
  userName: string;
  userAvatarUrl?: string | null;
  projectId: number;
  projectName: string;
}

export interface ApiNotificationSettings {
  emailNotifications: boolean;
  taskAssigned: boolean;
  taskUpdated: boolean;
  taskCommented: boolean;
  taskDueDate: boolean;
  projectInvitation: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  description: string; 
  link: string;
  isRead: boolean;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string | null;
  } | null;
}

export interface ApiInvitationDetails {
  inviterName: string;
  projectName: string;
  invitedEmail: string;
}