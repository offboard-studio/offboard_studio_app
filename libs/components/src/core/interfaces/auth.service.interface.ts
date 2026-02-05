export interface IAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface IAuthService {
  onAuthStateChanged(callback: (user: IAuthUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string, displayName: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithGithub(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): IAuthUser | null;
}
