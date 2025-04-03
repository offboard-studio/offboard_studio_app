import { ElectronHandler } from '../../electron/preload';

declare global {
  interface Window {
    electronAPI?: ElectronHandler;
  }
}
