import Editor from './editor';
import throttle from 'lodash/throttle';
import { ICollaborationService } from './interfaces/collaboration.service.interface';
import { firebaseCollaborationService } from '../infrastructure/firebase/firebase.collaboration.service';
import * as htmlToImage from 'html-to-image';

// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid type issues

class CollaborationManager {
  private static instance: CollaborationManager;
  private editor: Editor;
  private collaborationService: ICollaborationService;
  private currentProjectId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private isRemoteUpdate = false;
  private userId: string;
  private editorUnsubscribe: (() => void) | null = null;
  private modelListenerDeregistrator: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  private constructor(collaborationService: ICollaborationService) {
    this.editor = Editor.getInstance();
    this.collaborationService = collaborationService;
    // Generate a unique session ID by default to prevent "anonymous" conflicts
    this.userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public static getInstance() {
    if (!CollaborationManager.instance) {
      CollaborationManager.instance = new CollaborationManager(firebaseCollaborationService);
    }
    return CollaborationManager.instance;
  }

  public setUserId(userId: string) {
    if (userId) {
      this.userId = userId;
    }
  }

  public async startCollaboration(projectId: string) {
    if (this.currentProjectId === projectId) return;

    this.stopCollaboration();
    this.currentProjectId = projectId;

    // Initial load
    const data = await this.collaborationService.getProject(projectId);
    if (data) {
      // Check if project has valid data structure
      if ((!data.data || !data.data.nodes || !data.data.links) && !data.editor) {
        console.log('[Collaboration] Initializing empty project structure');
        // Initialize with empty structure
        const emptyProject = {
          ...data,
          data: {
            nodes: [],
            links: [],
            offset: { x: 0, y: 0 },
            zoom: 100
          },
          package: {
            name: data.name || 'Untitled Project',
            version: '1.0.0'
          }
        };
        this.isRemoteUpdate = true;
        this.editor.loadProject(emptyProject, emptyProject.package.name);
        this.isRemoteUpdate = false;

        // Save initialized structure to Firestore
        await this.collaborationService.updateProject(projectId, emptyProject, this.userId);

        this.isRemoteUpdate = true;
        this.editor.loadProject(emptyProject, emptyProject.package.name);
        this.isRemoteUpdate = false;
      } else {
        console.log('[Collaboration] Loading remote project data');
        this.isRemoteUpdate = true;
        this.editor.loadProject(data, data.package?.name || 'Untitled');
        this.isRemoteUpdate = false;
      }
    } else {
      console.error('Project not found:', projectId);
    }

    // Start listening for remote changes
    this.unsubscribe = this.collaborationService.startListening(projectId, (data) => {
      if (this.isRemoteUpdate) return;

      if (data && data.updatedBy !== this.userId) {
        console.log(`[Collaboration] Remote update received from ${data.updatedBy}`);
        this.isRemoteUpdate = true;
        this.editor.loadProject(data, data.package?.name || 'Untitled');
        this.isRemoteUpdate = false;
      }
    });

    // Hook into editor changes - store unsubscribe to clean up later
    this.editorUnsubscribe = this.editor.addOnModelChange((model) => {
      // Deregister previous model listener before adding new one to prevent accumulation
      if (this.modelListenerDeregistrator) {
        this.modelListenerDeregistrator();
        this.modelListenerDeregistrator = null;
      }

      // Register listener on the new model and store deregistrator
      const handler = model.registerListener({
        nodesUpdated: () => this.syncLocalToRemote(),
        linksUpdated: () => this.syncLocalToRemote(),
        offsetUpdated: () => this.syncLocalToRemote(),
        zoomUpdated: () => this.syncLocalToRemote(),
      });

      this.modelListenerDeregistrator = () => handler.deregister();
    });

    // Hook into config changes (AI settings etc)
    this.configUnsubscribe = this.editor.addOnConfigChange(() => {
        console.log('[CollaborationManager] Config change detected, syncing...');
        this.syncLocalToRemote();
    });
  }

  public stopCollaboration() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.editorUnsubscribe) {
      this.editorUnsubscribe();
      this.editorUnsubscribe = null;
    }
    if (this.modelListenerDeregistrator) {
      this.modelListenerDeregistrator();
      this.modelListenerDeregistrator = null;
    }
    if (this.configUnsubscribe) {
        this.configUnsubscribe();
        this.configUnsubscribe = null;
    }
    this.currentProjectId = null;
  }

  private removeSelection(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(v => this.removeSelection(v));
    }
    if (typeof obj === 'object') {
      const newObj: any = {};
      Object.keys(obj).forEach(key => {
        // Skip 'selected' property to prevent UI fighting between users
        if (key === 'selected') return;

        const value = this.removeSelection(obj[key]);
        if (value !== undefined) {
          newObj[key] = value;
        }
      });
      return newObj;
    }
    return obj;
  }

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(v => this.removeUndefined(v));
    }
    if (typeof obj === 'object') {
      const newObj: any = {};
      Object.keys(obj).forEach(key => {
        const value = this.removeUndefined(obj[key]);
        if (value !== undefined) {
          newObj[key] = value;
        }
      });
      return newObj;
    }
    return obj;
  }

  // Separate debounced screenshot capture (heavy operation)
  private debouncedScreenshot = throttle(async () => {
    if (!this.currentProjectId) return;
    const boardElement = document.querySelector('.canvas-container') as HTMLElement;
    if (boardElement) {
      try {
        const dataUrl = await htmlToImage.toJpeg(boardElement, {
          quality: 0.5,
          width: 400,
          height: 300,
          canvasWidth: 400,
          canvasHeight: 300,
          backgroundColor: '#1e1e1e',
          style: { transform: 'scale(1)' }
        });
        // Update ONLY the image field in Firestore
        await this.collaborationService.updateProject(this.currentProjectId, { image: dataUrl }, this.userId);
        console.log('[CollaborationManager] Screenshot background update complete');
      } catch (imgError) {
        console.warn('[CollaborationManager] Screenshot capture failed:', imgError);
      }
    }
  }, 30000); // Run at most every 30 seconds

  private throttledSync = throttle(async () => {
    if (!this.currentProjectId || this.isRemoteUpdate) return;

    console.log('[CollaborationManager] Syncing local changes to remote');
    try {
      const serializedData = this.editor.serialise();
      // 1. Remove Selection state (so users don't see each other's selections)
      const dataWithoutSelection = this.removeSelection(serializedData);
      // 2. Remove Undefined (Firestore safety)
      const cleanData = this.removeUndefined(dataWithoutSelection);

      // We don't want to overwrite the image with null if we aren't sending it
      // So we just send the data. data.image might be in serializedData depending on implementation
      // typically we store image on the root project object in Firestore, not inside the serialization of the diagram model?
      // Actually serialization returns the model. We are mixing Project vs Model data. 
      // The `editor.serialise()` returns the model JSON.
      // The `updateProject` takes IProject-like partial.
      // Let's ensure we are syncing deserializable data.

      await this.collaborationService.updateProject(this.currentProjectId, cleanData, this.userId);
      console.log('[CollaborationManager] Sync completed successfully');

      // Trigger screenshot in background
      this.debouncedScreenshot();
    } catch (error) {
      console.error('[CollaborationManager] Sync failed:', error);
    }
  }, 1000); // 1s sync for better responsiveness

  public syncLocalToRemote() {
    if (this.isRemoteUpdate) return;
    this.throttledSync();
  }
}

export default CollaborationManager;
