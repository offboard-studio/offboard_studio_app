export interface IProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[]; // List of user IDs who have access
  createdAt: any;
  updatedAt: any;
  status: 'draft' | 'active' | 'completed' | 'archived';
  thumbnailUrl?: string;
  data?: any;
  visibility: 'public' | 'private'; // New field for open-source control
}

export interface IProjectService {
  getProjects(userId: string): Promise<IProject[]>;
  getProject(projectId: string): Promise<IProject | null>;
  createProject(project: Partial<IProject>): Promise<string>;
  updateProject(projectId: string, data: Partial<IProject>): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  inviteMember(projectId: string, email: string): Promise<void>;
  removeMember(projectId: string, userId: string): Promise<void>;
  getUserProfiles(userIds: string[]): Promise<any[]>;
  getUserProfile(userId: string): Promise<any | null>;
  getAllUsers(limit?: number): Promise<any[]>; // For user browsing/search
  startListeningToProject(projectId: string, callback: (project: IProject) => void): () => void; // Real-time listener
}
