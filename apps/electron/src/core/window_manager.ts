import { BrowserWindow, screen, shell, app } from 'electron';
import path from 'path';
import { resolveHtmlPath } from '../util';
import MenuBuilder from '../app/menu';
import packageJson from '../../../../package.json';

interface SafeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  workAreaSize: { width: number; height: number };
}

export class WindowManager {
  private windows: Record<string, BrowserWindow | null> = {};
  private readonly PRELOAD_SCRIPT: string;
  private readonly RESOURCES_PATH: string;
  private readonly INDEX_HTML_PATH: string;
  private readonly MAIN_WINDOW_KEY = 'main';

  constructor() {
    this.PRELOAD_SCRIPT = this.getPreloadScript();
    this.RESOURCES_PATH = this.getResourcesPath();
    this.INDEX_HTML_PATH = resolveHtmlPath('index.html');
  }

  private getPreloadScript(): string {
    return path.join(__dirname, 'main.preload.js');
  }

  private getResourcesPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, '.config/assets');
    }
    return path.join(__dirname, '../../../.config/assets');
  }

  private getAssetPath(...paths: string[]): string {
    return path.join(this.RESOURCES_PATH, ...paths);
  }

  private getSafeDisplayBounds(): SafeBounds {
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();

      if (!displays || displays.length === 0) {
        return {
          x: 0,
          y: 0,
          width: 1424,
          height: 1028,
          workAreaSize: { width: 1424, height: 1028 },
        };
      }

      const display = displays.length > 0 ? displays[0] : primaryDisplay;
      return {
        x: display.bounds.x || 0,
        y: display.bounds.y || 0,
        width: Math.min(display.workAreaSize.width || 1424, 1424),
        height: Math.min(display.workAreaSize.height || 1028, 1028),
        workAreaSize: display.workAreaSize,
      };
    } catch (error) {
      console.error('Display bounds alınırken hata:', error);
      return {
        x: 0,
        y: 0,
        width: 1424,
        height: 1028,
        workAreaSize: { width: 1424, height: 1028 },
      };
    }
  }

  private getSafeWindowBounds(
    requestedWidth: number = 1424,
    requestedHeight: number = 1028
  ) {
    const safeBounds = this.getSafeDisplayBounds();
    return {
      x: safeBounds.x,
      y: safeBounds.y,
      width: Math.min(requestedWidth, safeBounds.workAreaSize.width),
      height: Math.min(requestedHeight, safeBounds.workAreaSize.height),
    };
  }

  private setWindowTitle(window: BrowserWindow) {
    window.on('page-title-updated', (e) => e.preventDefault());
    window.setTitle(`Offboard Studio App - v${packageJson.version}`);
  }

  private addWindowToWindowsMap(key: string, window: BrowserWindow) {
    this.windows[key] = window;
  }

  private removeWindowFromWindowsMap(key: string) {
    this.windows[key] = null;
  }

  private setupWindowEventHandlers(window: BrowserWindow) {
    window.on('ready-to-show', () => {
      try {
        if (process.env.START_MINIMIZED) {
          window.minimize();
        } else {
          window.show();
          window.focus();
        }
      } catch (error) {
        console.error('Pencere gösterilirken hata:', error);
      }
    });

    window.on('will-resize', (event, newBounds) => {
      try {
        const safeBounds = this.getSafeDisplayBounds();
        if (
          newBounds.width > safeBounds.workAreaSize.width ||
          newBounds.height > safeBounds.workAreaSize.height
        ) {
          event.preventDefault();
          window.setBounds({
            x: newBounds.x,
            y: newBounds.y,
            width: Math.min(newBounds.width, safeBounds.workAreaSize.width),
            height: Math.min(newBounds.height, safeBounds.workAreaSize.height),
          });
        }
      } catch (error) {
        console.error('Will-resize event hatası:', error);
      }
    });

    window.on('resize', () => {
      try {
        const bounds = window.getBounds();
        const safeBounds = this.getSafeDisplayBounds();
        if (
          bounds.width > safeBounds.workAreaSize.width ||
          bounds.height > safeBounds.workAreaSize.height
        ) {
          window.setBounds({
            width: Math.min(bounds.width, safeBounds.workAreaSize.width),
            height: Math.min(bounds.height, safeBounds.workAreaSize.height),
          });
        }
      } catch (error) {
        console.error('Pencere yeniden boyutlandırılırken hata:', error);
      }
    });

    window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`URL yükleme hatası: ${errorCode} - ${errorDescription} - ${validatedURL}`);
    });

    window.webContents.on('dom-ready', () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            try {
              window.webContents.openDevTools({ mode: 'detach' });
            } catch (devToolsError) {
              console.error('DevTools açılırken hata:', devToolsError);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('DOM ready event hatası:', error);
      }
    });

    window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message.includes('swagger') || message.includes('OpenAPI')) {
        console.log(`Swagger Console [${level}]: ${message}`);
      }
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupScreenEventHandlers(window: BrowserWindow) {
    screen.on('display-added', () => {
      console.log('Yeni ekran eklendi');
    });

    screen.on('display-removed', () => {
      console.log('Ekran çıkarıldı - pencere pozisyonu kontrol ediliyor');
      try {
        const safeBounds = this.getSafeDisplayBounds();
        window.setBounds({
          x: safeBounds.x,
          y: safeBounds.y,
          width: Math.min(window.getBounds().width, safeBounds.width),
          height: Math.min(window.getBounds().height, safeBounds.height),
        });
      } catch (error) {
        console.error('Ekran çıkarıldıktan sonra pencere pozisyonu ayarlanırken hata:', error);
      }
    });
  }

  async createMainWindow(): Promise<void> {
    const windowBounds = this.getSafeWindowBounds(1424, 1028);

    const mainWindow = new BrowserWindow({
      show: false,
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      icon: this.getAssetPath('icon.png'),
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
        contextIsolation: true,
        nodeIntegration: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        devTools: process.env.NODE_ENV === 'development',
      },
      minWidth: 800,
      minHeight: 600,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    });

    this.addWindowToWindowsMap(this.MAIN_WINDOW_KEY, mainWindow);
    this.setWindowTitle(mainWindow);
    this.setupWindowEventHandlers(mainWindow);
    this.setupScreenEventHandlers(mainWindow);

    mainWindow.on('closed', () => {
      this.removeWindowFromWindowsMap(this.MAIN_WINDOW_KEY);
    });

    mainWindow.loadURL(this.INDEX_HTML_PATH);
    this.createMenu(mainWindow);
  }

  openNewWindow(url: string, windowKey: string): void {
    const windowBounds = this.getSafeWindowBounds(1024, 728);

    const newWindow = new BrowserWindow({
      width: windowBounds.width,
      height: windowBounds.height,
      icon: this.getAssetPath('icon.png'),
      x: windowBounds.x,
      y: windowBounds.y,
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
        contextIsolation: true,
        nodeIntegration: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
      },
      minWidth: 600,
      minHeight: 400,
    });

    this.setWindowTitle(newWindow);
    this.addWindowToWindowsMap(windowKey, newWindow);

    newWindow.on('closed', () => {
      this.removeWindowFromWindowsMap(windowKey);
    });

    newWindow.loadURL(this.INDEX_HTML_PATH + url);
  }

  private createMenu(window: BrowserWindow) {
    const menuBuilder = new MenuBuilder(window);
    menuBuilder.buildMenu();
  }

  hasMainWindow(): boolean {
    return this.windows[this.MAIN_WINDOW_KEY] !== null;
  }
}
