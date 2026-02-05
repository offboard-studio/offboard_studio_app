import { doc, setDoc, onSnapshot, deleteDoc, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../infrastructure/firebase/init';
import { getUserColor } from '../../theme';

export interface UserPresence {
  odcId: string;
  projectId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  color: string;
  cursor: {
    x: number;
    y: number;
  } | null;
  selection: string[] | null; // Selected node IDs
  lastActive: Timestamp;
  status: 'active' | 'idle' | 'away';
  currentView: 'board' | 'settings' | 'ai-config' | 'deploy';
}

export interface PresenceState {
  users: Map<string, UserPresence>;
  currentUser: UserPresence | null;
}

type PresenceListener = (state: PresenceState) => void;

class PresenceManager {
  private static instance: PresenceManager;
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;
  private currentUser: UserPresence | null = null;
  private users: Map<string, UserPresence> = new Map();
  private listeners: Set<PresenceListener> = new Set();
  private unsubscribe: (() => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly IDLE_TIMEOUT = 60000; // 1 minute
  private readonly AWAY_TIMEOUT = 300000; // 5 minutes

  private constructor() {
    // Track user activity
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.resetIdleTimer.bind(this));
      window.addEventListener('keydown', this.resetIdleTimer.bind(this));
      window.addEventListener('beforeunload', this.handleUnload.bind(this));
    }
  }

  public static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  public async joinProject(
    projectId: string,
    user: { odcId: string; displayName: string; email: string; photoURL?: string | null }
  ): Promise<void> {
    // Leave current project if any
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      await this.leaveProject();
    }

    this.currentProjectId = projectId;
    this.currentUserId = user.odcId;

    // Create presence document
    this.currentUser = {
      odcId: user.odcId,
      projectId,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL || null,
      color: getUserColor(user.odcId),
      cursor: null,
      selection: null,
      lastActive: Timestamp.now(),
      status: 'active',
      currentView: 'board',
    };

    // Write presence to Firestore
    await this.updatePresence();

    // Start heartbeat
    this.startHeartbeat();

    // Start listening to other users
    this.startListening();

    // Reset idle timer
    this.resetIdleTimer();
  }

  public async leaveProject(): Promise<void> {
    if (this.currentProjectId && this.currentUserId) {
      // Delete presence document
      const presenceRef = doc(
        db,
        'projects',
        this.currentProjectId,
        'presence',
        this.currentUserId
      );
      await deleteDoc(presenceRef).catch(() => {
        // Ignore errors on leave
      });
    }

    this.stopHeartbeat();
    this.stopListening();
    this.users.clear();
    this.currentProjectId = null;
    this.currentUserId = null;
    this.currentUser = null;
    this.notifyListeners();
  }

  public async updateCursor(x: number, y: number): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.cursor = { x, y };
    this.currentUser.lastActive = Timestamp.now();
    this.currentUser.status = 'active';
    await this.updatePresence();
  }

  public async updateSelection(nodeIds: string[]): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.selection = nodeIds.length > 0 ? nodeIds : null;
    this.currentUser.lastActive = Timestamp.now();
    await this.updatePresence();
  }

  public async updateView(view: UserPresence['currentView']): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.currentView = view;
    this.currentUser.lastActive = Timestamp.now();
    await this.updatePresence();
  }

  public subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): PresenceState {
    return {
      users: new Map(this.users),
      currentUser: this.currentUser,
    };
  }

  public getActiveUsers(): UserPresence[] {
    return Array.from(this.users.values()).filter(
      (user) => user.odcId !== this.currentUserId
    );
  }

  public getUserCount(): number {
    return this.users.size;
  }

  private async updatePresence(): Promise<void> {
    if (!this.currentProjectId || !this.currentUserId || !this.currentUser) return;

    const presenceRef = doc(
      db,
      'projects',
      this.currentProjectId,
      'presence',
      this.currentUserId
    );

    await setDoc(presenceRef, {
      ...this.currentUser,
      lastActive: Timestamp.now(),
    }).catch((error) => {
      console.warn('[PresenceManager] Failed to update presence:', error);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentUser) {
        this.currentUser.lastActive = Timestamp.now();
        await this.updatePresence();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startListening(): void {
    if (!this.currentProjectId) return;

    const presenceCollection = collection(
      db,
      'projects',
      this.currentProjectId,
      'presence'
    );

    this.unsubscribe = onSnapshot(presenceCollection, (snapshot) => {
      this.users.clear();

      snapshot.forEach((doc) => {
        const data = doc.data() as UserPresence;
        // Filter out stale presence (older than 2 minutes)
        const lastActive = data.lastActive?.toDate?.() || new Date(0);
        const isStale = Date.now() - lastActive.getTime() > 120000;

        if (!isStale) {
          this.users.set(doc.id, data);
        }
      });

      this.notifyListeners();
    });
  }

  private stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    // Set to active
    if (this.currentUser && this.currentUser.status !== 'active') {
      this.currentUser.status = 'active';
      this.updatePresence();
    }

    // Set idle after timeout
    this.idleTimeout = setTimeout(() => {
      if (this.currentUser) {
        this.currentUser.status = 'idle';
        this.updatePresence();

        // Set away after longer timeout
        this.idleTimeout = setTimeout(() => {
          if (this.currentUser) {
            this.currentUser.status = 'away';
            this.updatePresence();
          }
        }, this.AWAY_TIMEOUT - this.IDLE_TIMEOUT);
      }
    }, this.IDLE_TIMEOUT);
  }

  private handleUnload(): void {
    // Synchronously try to leave project
    if (this.currentProjectId && this.currentUserId) {
      // Use sendBeacon for reliable delivery on page unload
      const presenceRef = `projects/${this.currentProjectId}/presence/${this.currentUserId}`;
      navigator.sendBeacon?.(
        `https://firestore.googleapis.com/v1/${presenceRef}`,
        JSON.stringify({ delete: true })
      );
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

export default PresenceManager;
