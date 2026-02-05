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
import { AppError, ErrorCode, mapFirebaseError, getErrorMessage } from '../../core/errors';

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
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Failed to sync user profile:', error);
      // Don't throw - profile sync is not critical for auth
    }
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
    try {
      if (!email || !password) {
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Email and password are required',
        });
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await this.syncUserProfile(userCredential.user);
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw mapFirebaseError(error as { code?: string; message?: string });
    }
  }

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<void> {
    try {
      if (!email || !password) {
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Email and password are required',
        });
      }

      if (password.length < 6) {
        throw new AppError({
          code: ErrorCode.AUTH_WEAK_PASSWORD,
          message: getErrorMessage(ErrorCode.AUTH_WEAK_PASSWORD),
        });
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      await this.syncUserProfile(userCredential.user);
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw mapFirebaseError(error as { code?: string; message?: string });
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await this.syncUserProfile(userCredential.user);
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw mapFirebaseError(error as { code?: string; message?: string });
    }
  }

  async signInWithGithub(): Promise<void> {
    try {
      const provider = new GithubAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await this.syncUserProfile(userCredential.user);
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw mapFirebaseError(error as { code?: string; message?: string });
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      console.error('Sign out failed:', error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Failed to sign out. Please try again.',
        originalError: error,
      });
    }
  }

  getCurrentUser(): IAuthUser | null {
    return this.mapUser(auth.currentUser);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
