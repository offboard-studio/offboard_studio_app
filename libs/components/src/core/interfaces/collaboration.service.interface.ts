export interface ICollaborationService {
  startListening(projectId: string, onUpdate: (data: any) => void): () => void;
  updateProject(projectId: string, data: any, userId: string): Promise<void>;
  getProject(projectId: string): Promise<any>;
}
