type OpenNewWindowArgs = {
  url: string;
  windowKey: string;
};

/**
 * When opening a window, the equivalent route must exist in the react app router
 * The react app should us a hash router so your url here should be - #/my-example-react-route
 */
export const openNewWindow = ({ url, windowKey }: OpenNewWindowArgs): void => {
  if (window.electronAPI) {
    window.electronAPI.ipcRenderer.openNewWindow(url, windowKey);
  }
};

export const closeWindow = (): void => {
  window.close();
};
