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

    if (!snapshot.exists()) {
      console.warn('Project not found:', projectId);
      return null;
    }

    const data = snapshot.data();

    // Ensure the data has the required editor structure
    if (!data.editor) {
      console.warn('Project missing editor data, initializing empty structure');
      data.editor = {
        id: '',
        offsetX: 0,
        offsetY: 0,
        zoom: 100,
        gridSize: 20,
        layers: [],
        locked: false
      };
    }

    if (!data.package) {
      data.package = {
        name: data.name || 'Untitled',
        version: '1.0.0',
        description: data.description || '',
        author: '',
        image: ''
      };
    }

    if (!data.design) {
      data.design = {
        graph: { blocks: {}, wires: [] }
      };
    }

    if (!data.dependencies) {
      data.dependencies = {};
    }

    return data;
  }
}

export const firebaseCollaborationService = new FirebaseCollaborationService();
