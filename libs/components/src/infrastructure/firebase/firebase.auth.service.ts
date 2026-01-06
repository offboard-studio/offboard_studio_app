import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User
} from 'firebase/auth';
import { auth } from './init';
import { db } from './init';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { IAuthService, IAuthUser } from '../../core/interfaces/auth.service.interface';

export class FirebaseAuthService implements IAuthService {
  private mapUser(user: User | null): IAuthUser | null {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  private async syncUserProfile(user: User): Promise<void> {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastSeen: serverTimestamp()
    }, { merge: true });
  }

  onAuthStateChanged(callback: (user: IAuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.syncUserProfile(user);
      }
      callback(this.mapUser(user));
    });
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await this.syncUserProfile(userCredential.user);
  }

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await this.syncUserProfile(userCredential.user);
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await this.syncUserProfile(userCredential.user);
  }

  async signInWithGithub(): Promise<void> {
    const provider = new GithubAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await this.syncUserProfile(userCredential.user);
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): IAuthUser | null {
    return this.mapUser(auth.currentUser);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
