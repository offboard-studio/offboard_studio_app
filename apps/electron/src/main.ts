/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build:app`, this file is compiled to
 * `./release/build/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, shell, ipcMain, IpcMainEvent } from 'electron';
import path from 'path';

import { ApiServer } from '@api/api';
import { resolveHtmlPath } from './util';
import packageJson from '../../../package.json';
import MenuBuilder from './app/menu';

class AppUpdater {
  constructor() {
    const electronLog = require('electron-log');
    const { autoUpdater } = require('electron-updater');

    electronLog.transports.file.level = 'info';
    autoUpdater.logger = electronLog;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

export default class ElectronApp {
  server: ApiServer | null = null;
  windows: Record<string, BrowserWindow | null> = {};
  PRELOAD_SCRIPT = '';
  RESOURCES_PATH = '';
  MAIN_WINDOW_KEY = 'main';
  INDEX_HTML_PATH = '';

  constructor() {
    this.PRELOAD_SCRIPT = this.getPreloadScript();
    this.RESOURCES_PATH = this.getResourcesPath();
    this.INDEX_HTML_PATH = resolveHtmlPath('index.html');

    this.setup();
  }

  getPreloadScript() {
    return path.join(__dirname, 'main.preload.js');
  }

  getResourcesPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, '.config/assets');
    }

    return path.join(__dirname, '../../../.config/assets');
  }

  createServer() {
    const { Api } = require('@api/api');

    const api = new Api();
    this.server = api.server;
  }

  closeServer() {
    this.server?.close();
  }

  setWindowTitle(window: BrowserWindow) {
    window.on('page-title-updated', (e) => e.preventDefault());
    window.setTitle(
      `Offboard Studio App - v${packageJson.version}`
    );
  }

  addWindowToWindowsMap(key: string, window: BrowserWindow) {
    this.windows[key] = window;
  }

  removeWindowFromWindowsMap(key: string) {
    this.windows[key] = null;
  }

  async createMainWindow() {
    const getAssetPath = (...paths: string[]): string => {
      return path.join(this.RESOURCES_PATH, ...paths);
    };

    const mainWindow = new BrowserWindow({
      show: false,
      width: 1424,
      height: 1028,
      icon: getAssetPath('icon.png'),
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
      },
    });

    this.addWindowToWindowsMap(this.MAIN_WINDOW_KEY, mainWindow);
    this.setWindowTitle(mainWindow);

    mainWindow.on('ready-to-show', () => {
      const localMainWindow = this.windows[this.MAIN_WINDOW_KEY];

      if (!localMainWindow) {
        throw new Error('"mainWindow" is not defined');
      }

      if (process.env.START_MINIMIZED) {
        localMainWindow.minimize();
      } else {
        localMainWindow.show();
      }
    });

    mainWindow.on('closed', () => {
      this.removeWindowFromWindowsMap(this.MAIN_WINDOW_KEY);
    });

    mainWindow.loadURL(this.INDEX_HTML_PATH);

    // Open urls in the user's browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.createMenu(mainWindow);

    // Remove this if your app does not use auto updates
    this.createAppUpdater();
  }

  createMenu(window: BrowserWindow) {
    const menuBuilder = new MenuBuilder(window);
    menuBuilder.buildMenu();
  }

  createAppUpdater() {
    new AppUpdater();
  }

  addAppEventListeners() {
    app.on('quit', () => {
      this.closeServer();
    });

    app.on('window-all-closed', () => {
      // Respect the OSX convention of having the application in memory even
      // after all windows have been closed
      if (process.platform !== 'darwin') {
        this.closeServer();
        app.quit();
      }
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (this.windows[this.MAIN_WINDOW_KEY] === null) {
        this.createMainWindow();
      }
    });
  }

  openNewWindow(url: string, windowKey: string) {
    const newWindow = new BrowserWindow({
      width: 1024,
      height: 728,
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
      },
    });

    this.setWindowTitle(newWindow);
    this.addWindowToWindowsMap(windowKey, newWindow);

    newWindow.on('closed', () => {
      this.removeWindowFromWindowsMap(windowKey);
    });

    newWindow.loadURL(this.INDEX_HTML_PATH + url);
  }

  addIPCRenderEventListeners() {
    ipcMain.on(
      'open-new-window',
      (_event: IpcMainEvent, url: string, windowKey: string) =>
        this.openNewWindow(url, windowKey)
    );
  }

  async setup() {
    this.addAppEventListeners();

    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      const debugElectron = require('electron-debug');

      debugElectron();
    }

    try {
      await app.whenReady();
      this.addIPCRenderEventListeners();
      this.createMainWindow();
      this.createServer();
    } catch (err) {
      console.log('Error: setting up app - ', err);
    }
  }
}

new ElectronApp();
