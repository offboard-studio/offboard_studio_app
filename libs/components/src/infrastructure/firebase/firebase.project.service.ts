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
  arrayUnion,
  arrayRemove,
  or
} from 'firebase/firestore';
import { db } from './init';
import { IProject, IProjectService } from '../../core/interfaces/project.service.interface';

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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: project.status || 'draft'
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

  async inviteMember(projectId: string, email: string): Promise<void> {
    // 1. Find user by email in 'users' collection
    const usersQ = query(collection(db, this.usersCollection), where('email', '==', email));
    const userSnapshot = await getDocs(usersQ);

    if (userSnapshot.empty) {
      throw new Error('User not found with this email.');
    }

    const userId = userSnapshot.docs[0].id;
    const projectRef = doc(db, this.collectionName, projectId);

    await updateDoc(projectRef, {
      members: arrayUnion(userId),
      updatedAt: Timestamp.now()
    });
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const projectRef = doc(db, this.collectionName, projectId);
    await updateDoc(projectRef, {
      members: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
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
}

export const firebaseProjectService = new FirebaseProjectService();
