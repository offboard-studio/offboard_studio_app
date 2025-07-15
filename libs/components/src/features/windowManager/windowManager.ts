// libs/components/src/features/windowManager/windowManager.ts

export interface OpenNewWindowArgs {
  url: string;
  windowKey: string;
}

/**
 * Electron API kullanarak yeni pencere açar
 */
export const openNewWindow = ({ url, windowKey }: OpenNewWindowArgs): void => {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI) {
    electronAPI.ipcRenderer.openNewWindow(url, windowKey);
  }
};

export const closeWindow = (): void => {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI) {
    electronAPI.ipcRenderer.closeWindow();
  }
};