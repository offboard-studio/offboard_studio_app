import { app } from 'electron';
import { ServerManager } from './server_manager';
import { WindowManager } from './window_manager';
import { IPCManager } from './ipc_manager';
import { AppUpdater } from './app_updater';
import { resolveHtmlPath } from '../util';

export default class ElectronApp {
  private serverManager: ServerManager;
  private windowManager: WindowManager;
  private ipcManager: IPCManager;
  private appUpdater: AppUpdater;
  private isQuitting = false;

  constructor() {
    this.serverManager = new ServerManager();
    this.windowManager = new WindowManager();
    this.ipcManager = new IPCManager(this.serverManager);
    this.appUpdater = new AppUpdater();

    this.setup();
  }

  private async setup() {
    this.addAppEventListeners();

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      const debugElectron = require('electron-debug');
      debugElectron();
    }

    try {
      await app.disableHardwareAcceleration();
      await app.whenReady();

      await this.validateDevServer();

      this.ipcManager.setupIPCHandlers();
      await this.windowManager.createMainWindow();
      this.serverManager.createServer();

      if (app.isPackaged && process.env.NODE_ENV !== 'development') {
        // await migrateDatabase();
      }
    } catch (err) {
      console.error('Error: setting up app - ', err);
      app.quit();
    }
  }

  private async validateDevServer(): Promise<void> {
    const url = resolveHtmlPath('index.html');

    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      const net = require('net');
      const port = parseInt(process.env.PORT || '3001');
      let isAlive = false;
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds

      console.log(`Checking if renderer is alive at 127.0.0.1:${port}...`);

      while (!isAlive && attempts < maxAttempts) {
        attempts++;
        isAlive = await new Promise<boolean>((resolve) => {
          const client = net.createConnection({ host: '127.0.0.1', port }, () => {
            client.end();
            resolve(true);
          });
          client.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 400); // Connection timeout
        });

        if (!isAlive) {
          console.log(`Attempt ${attempts}/${maxAttempts}: Renderer not ready yet...`);
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!isAlive) {
        console.error(`❌ Vite dev server not running at 127.0.0.1:${port} after ${maxAttempts} attempts.`);
        // Note: We don't quit immediately anymore to allow dev to see the error or for Vite to catch up
      } else {
        console.log(`✅ Vite dev server is alive at 127.0.0.1:${port}`);
      }
    }
  }

  private addAppEventListeners() {
    app.on('before-quit', async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        await this.gracefulShutdown();
      }
    });

    app.on('window-all-closed', async () => {
      if (process.platform !== 'darwin') {
        if (!this.isQuitting) {
          await this.gracefulShutdown();
        }
      }
    });

    app.on('activate', () => {
      if (!this.windowManager.hasMainWindow()) {
        this.windowManager.createMainWindow();
      }
    });

    // Process signals
    process.on('SIGTERM', async () => {
      console.log('SIGTERM alındı, graceful shutdown yapılıyor...');
      await this.gracefulShutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT alındı, graceful shutdown yapılıyor...');
      await this.gracefulShutdown();
      process.exit(0);
    });
  }

  private async gracefulShutdown() {
    if (this.isQuitting) return;

    this.isQuitting = true;
    console.log("Uygulama kapatılıyor, server'lar durduruluyor...");

    try {
      await this.serverManager.closeAllServers();
      console.log("Tüm server'lar başarıyla kapatıldı");
    } catch (error) {
      console.error("Server'lar kapatılırken hata:", error);
    }

    app.quit();
  }
}