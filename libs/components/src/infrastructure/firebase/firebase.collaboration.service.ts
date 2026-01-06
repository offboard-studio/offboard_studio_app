import { doc, onSnapshot, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './init';
import { ICollaborationService } from '../../core/interfaces/collaboration.service.interface';

export class FirebaseCollaborationService implements ICollaborationService {
  startListening(projectId: string, onUpdate: (data: any) => void): () => void {
    const projectRef = doc(db, 'projects', projectId);
    return onSnapshot(projectRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        onUpdate(data);
      }
    });
  }

  async updateProject(projectId: string, data: any, userId: string): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    await setDoc(projectRef, {
      ...data,
      updatedAt: Timestamp.now(),
      updatedBy: userId
    }, { merge: true });
  }

  async getProject(projectId: string): Promise<any> {
    const projectRef = doc(db, 'projects', projectId);
    const snapshot = await getDoc(projectRef);
    return snapshot.exists() ? snapshot.data() : null;
  }
}

export const firebaseCollaborationService = new FirebaseCollaborationService();
