import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  or,
  onSnapshot
} from 'firebase/firestore';
import { db } from './init';
import { IProject, IProjectService } from '../../core/interfaces/project.service.interface';
import { AppError, ErrorCode, getErrorMessage } from '../../core/errors';

export class FirebaseProjectService implements IProjectService {
  private readonly collectionName = 'projects';
  private readonly usersCollection = 'users';

  async getProjects(userId: string): Promise<IProject[]> {
    // Custom query to find projects where user is owner OR a member
    const q = query(
      collection(db, this.collectionName),
      or(
        where('ownerId', '==', userId),
        where('members', 'array-contains', userId)
      )
    );

    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as IProject));

    // Sort client-side to avoid index requirement until user creates it
    return projects.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return timeB - timeA;
    });
  }

  async getProject(projectId: string): Promise<IProject | null> {
    const projectRef = doc(db, this.collectionName, projectId);
    const snapshot = await getDoc(projectRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as IProject : null;
  }

  async createProject(project: Partial<IProject>): Promise<string> {
    const ownerId = project.ownerId || '';
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...project,
      ownerId,
      members: [ownerId], // Owner is always a member
      visibility: 'private', // Default to private
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: project.status || 'draft',
      // Initialize complete editor data structure
      editor: {
        id: '',
        offsetX: 0,
        offsetY: 0,
        zoom: 100,
        gridSize: 20,
        layers: [],
        locked: false
      },
      design: {
        graph: { blocks: {}, wires: [] }
      },
      dependencies: {},
      package: {
        name: project.name || 'Untitled Project',
        version: '1.0.0',
        description: project.description || '',
        author: '',
        image: ''
      }
    });
    return docRef.id;
  }

  async updateProject(projectId: string, data: Partial<IProject>): Promise<void> {
    const projectRef = doc(db, this.collectionName, projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(db, this.collectionName, projectId);
    await deleteDoc(projectRef);
  }

  async addMember(projectId: string, email: string): Promise<void> {
    try {
      if (!email || !email.includes('@')) {
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Please enter a valid email address.',
        });
      }

      // 1. Find user by email in 'users' collection
      const usersQ = query(collection(db, this.usersCollection), where('email', '==', email));
      const userSnapshot = await getDocs(usersQ);

      if (userSnapshot.empty) {
        throw new AppError({
          code: ErrorCode.COLLAB_USER_NOT_FOUND,
          message: getErrorMessage(ErrorCode.COLLAB_USER_NOT_FOUND),
        });
      }

      const userId = userSnapshot.docs[0].id;

      // 2. Check if user is already a member
      const project = await this.getProject(projectId);
      if (project?.members?.includes(userId)) {
        throw new AppError({
          code: ErrorCode.COLLAB_ALREADY_MEMBER,
          message: getErrorMessage(ErrorCode.COLLAB_ALREADY_MEMBER),
        });
      }

      const projectRef = doc(db, this.collectionName, projectId);

      await updateDoc(projectRef, {
        members: arrayUnion(userId),
        updatedAt: Timestamp.now()
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Failed to add member. Please try again.',
        originalError: error,
      });
    }
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'User ID is required.',
        });
      }

      const projectRef = doc(db, this.collectionName, projectId);
      await updateDoc(projectRef, {
        members: arrayRemove(userId),
        updatedAt: Timestamp.now()
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Failed to remove member. Please try again.',
        originalError: error,
      });
    }
  }

  async getUserProfiles(userIds: string[]): Promise<any[]> {
    if (!userIds || userIds.length === 0) return [];

    // Firestore limited to 30 values in 'in' query
    const profiles: any[] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const q = query(collection(db, this.usersCollection), where('uid', 'in', chunk));
      const snapshot = await getDocs(q);
      profiles.push(...snapshot.docs.map(doc => doc.data()));
    }
    return profiles;
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const userRef = doc(db, this.usersCollection, userId);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
  }

  async getAllUsers(limitNum: number = 50): Promise<any[]> {
    const usersQuery = query(
      collection(db, this.usersCollection),
      orderBy('displayName'),
      limit(limitNum)
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
  }

  startListeningToProject(projectId: string, callback: (project: IProject) => void): () => void {
    const projectRef = doc(db, 'projects', projectId);

    const unsubscribe = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({ id: snapshot.id, ...data } as IProject);
      }
    }, (error) => {
      console.error('Error listening to project:', error);
    });

    return unsubscribe;
  }
}

export const firebaseProjectService = new FirebaseProjectService();
