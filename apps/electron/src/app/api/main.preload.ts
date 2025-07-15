// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 'download-file' | 'save-file-direct' | 'open-new-window' | 'ai-build-sync';

// Download related types
export type DownloadFileArgs = {
  buffer: ArrayBuffer;
  filename: string;
  defaultPath?: string;
};

export type SaveFileDirectArgs = {
  buffer: ArrayBuffer;
  filePath: string;
};

export type DownloadResult = {
  success: boolean;
  filePath?: string;
  error?: string;
};

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    openNewWindow(url: string, windowKey: string) {
      ipcRenderer.send('open-new-window', url, windowKey);
    },
    
    // Download file with save dialog
    async downloadFile(args: DownloadFileArgs): Promise<DownloadResult> {
      return await ipcRenderer.invoke('download-file', args);
    },


    // Download file with save dialog
    async aiBuildSync(args: DownloadFileArgs): Promise<DownloadResult> {
      return await ipcRenderer.invoke('ai-build-sync', args);
    },
    
    // Save file directly to specified path
    async saveFileDirect(args: SaveFileDirectArgs): Promise<DownloadResult> {
      return await ipcRenderer.invoke('save-file-direct', args);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronHandler);

export type ElectronHandler = typeof electronHandler;