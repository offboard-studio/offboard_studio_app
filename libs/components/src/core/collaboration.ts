import Editor from './editor';
import throttle from 'lodash/throttle';
import { ICollaborationService } from './interfaces/collaboration.service.interface';
import { firebaseCollaborationService } from '../infrastructure/firebase/firebase.collaboration.service';

class CollaborationManager {
  private static instance: CollaborationManager;
  private editor: Editor;
  private collaborationService: ICollaborationService;
  private currentProjectId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private isRemoteUpdate = false;
  private userId: string = 'anonymous';

  private constructor(collaborationService: ICollaborationService) {
    this.editor = Editor.getInstance();
    this.collaborationService = collaborationService;
  }

  public static getInstance() {
    if (!CollaborationManager.instance) {
      CollaborationManager.instance = new CollaborationManager(firebaseCollaborationService);
    }
    return CollaborationManager.instance;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  public async startCollaboration(projectId: string) {
    if (this.currentProjectId === projectId) return;

    this.stopCollaboration();
    this.currentProjectId = projectId;

    // Initial load
    const data = await this.collaborationService.getProject(projectId);
    if (data) {
      // Check if project has valid data structure
      if (!data.data || !data.data.nodes || !data.data.links) {
        console.log('Initializing empty project structure');
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
      } else {
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
        console.log('Remote update received');
        this.isRemoteUpdate = true;
        this.editor.loadProject(data, data.package?.name || 'Untitled');
        this.isRemoteUpdate = false;
      }
    });

    // Hook into editor changes
    this.editor.setOnModelChange((model) => {
      model.registerListener({
        nodesUpdated: () => this.syncLocalToRemote(),
        linksUpdated: () => this.syncLocalToRemote(),
        offsetUpdated: () => this.syncLocalToRemote(),
        zoomUpdated: () => this.syncLocalToRemote(),
      });
    });
  }

  public stopCollaboration() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.currentProjectId = null;
  }

  private throttledSync = throttle(async () => {
    if (!this.currentProjectId || this.isRemoteUpdate) return;

    console.log('Syncing local changes to remote');
    const serializedData = this.editor.serialise();
    await this.collaborationService.updateProject(this.currentProjectId, serializedData, this.userId);
  }, 2000);

  public syncLocalToRemote() {
    this.throttledSync();
  }
}

export default CollaborationManager;
