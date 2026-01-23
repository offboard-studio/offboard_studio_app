import { doc, onSnapshot, setDoc, getDoc, Timestamp, writeBatch, deleteField } from 'firebase/firestore';
import { db } from './init';
import { ICollaborationService } from '../../core/interfaces/collaboration.service.interface';

export class FirebaseCollaborationService implements ICollaborationService {
  
  startListening(projectId: string, onUpdate: (data: any) => void): () => void {
    const projectRef = doc(db, 'projects', projectId);
    const contentRef = doc(db, 'projects', projectId, 'content', 'main');

    let rootData: any = null;
    let contentData: any = null;
    let initialized = false;

    // Helper to merge and value emit
    const emitUpdate = () => {
        if (!rootData) return; // Need at least root data
        
        const mergedData = {
            ...rootData,
            ...(contentData || {})
        };
        onUpdate(mergedData);
    };

    const unsubscribeRoot = onSnapshot(projectRef, (snapshot) => {
        if (snapshot.exists()) {
            rootData = snapshot.data();
            emitUpdate();
        }
    });

    const unsubscribeContent = onSnapshot(contentRef, (snapshot) => {
        if (snapshot.exists()) {
            contentData = snapshot.data();
            emitUpdate();
        } else {
             // Content might not exist for legacy projects, that's fine.
            contentData = null;
            // distinct check to trigger emit if we previously had content? 
            // Reuse current rootData if we have it
            if (rootData) emitUpdate(); 
        }
    });

    return () => {
        unsubscribeRoot();
        unsubscribeContent();
    };
  }

  async updateProject(projectId: string, data: any, userId: string): Promise<void> {
    // console.log(`[FirebaseService] Updating project ${projectId}, userId: ${userId}`);
    try {
      const projectRef = doc(db, 'projects', projectId);
      const contentRef = doc(db, 'projects', projectId, 'content', 'main');
      
      const batch = writeBatch(db);

      // Separate Heavy fields
      const heavyFields = ['design', 'editor', 'dependencies'];
      const rootUpdate: any = { updatedAt: Timestamp.now(), updatedBy: userId };
      const contentUpdate: any = {};
      let hasContentUpdate = false;

      // Classify data keys
      Object.keys(data).forEach(key => {
          if (heavyFields.includes(key)) {
              contentUpdate[key] = data[key];
              hasContentUpdate = true;
              // If we are writing heavy data to content, make sure to delete it from root (migration)
              rootUpdate[key] = deleteField(); 
          } else {
              rootUpdate[key] = data[key];
          }
      });

      // 1. Update Content (if needed)
      if (hasContentUpdate) {
          batch.set(contentRef, contentUpdate, { merge: true });
      }

      // 2. Update Root
      batch.set(projectRef, rootUpdate, { merge: true });

      await batch.commit();

      // console.log(`[FirebaseService] updateProject success for ${projectId}`);
    } catch (error) {
      console.error(`[FirebaseService] updateProject failed for ${projectId}:`, error);
      throw error;
    }
  }

  async getProject(projectId: string): Promise<any> {
    const projectRef = doc(db, 'projects', projectId);
    const contentRef = doc(db, 'projects', projectId, 'content', 'main');

    // Parallel fetch
    const [projectSnap, contentSnap] = await Promise.all([
        getDoc(projectRef),
        getDoc(contentRef)
    ]);

    if (!projectSnap.exists()) {
      console.warn('Project not found:', projectId);
      return null;
    }

    let data = projectSnap.data();

    if (contentSnap.exists()) {
        data = {
            ...data,
            ...contentSnap.data()
        };
    }

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
