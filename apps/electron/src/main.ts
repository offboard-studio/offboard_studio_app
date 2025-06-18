/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @nx/enforce-module-boundaries */
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build:app`, this file is compiled to
 * `./release/build/main.js` using webpack. This gives us some performance wins.
 */
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  IpcMainEvent,
  screen,
  session,
} from 'electron';
import path from 'path';
import os from 'os';

import { ServerController } from '@api';
import { resolveHtmlPath } from './util';
import packageJson from '../../../package.json';
import MenuBuilder from './app/menu';

import treeKill from 'tree-kill';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import axios from 'axios';
import { Server } from 'http';

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
  server: ServerController | null = null;
  windows: Record<string, BrowserWindow | null> = {};
  PRELOAD_SCRIPT = '';
  RESOURCES_PATH = '';
  MAIN_WINDOW_KEY = 'main';
  INDEX_HTML_PATH = '';
  djangoServer: ChildProcessWithoutNullStreams | null = null;
  isQuitting = false; // Kapanma durumunu takip et

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

  getBoardAPI() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'board_api/api');
    }

    return path.join(__dirname, '../../../board_api/api');
  }

  createServer() {
    const { ServerController } = require('@api');

    const api = new ServerController();
    this.server = api;
    this.server?.createServer();
  }

  // Server kapatma işlemini async hale getir ve promise döndür
  async closeServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.log('NestJS Server kapatılıyor...');
        try {
          // ServerController'da close method'u varsa kullan
          if (typeof this.server.close === 'function') {
            this.server.close(() => {
              console.log('NestJS Server başarıyla kapatıldı');
              this.server = null;
              resolve();
            });
          } else {
            // Eğer ServerController'da proper close method'u yoksa
            this.server = null;
            console.log('NestJS Server referansı temizlendi');
            resolve();
          }
        } catch (error) {
          console.error('NestJS Server kapatılırken hata:', error);
          this.server = null;
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  // Django server'ını güvenli şekilde kapat
  async closeDjangoServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.djangoServer) {
        console.log('Django Server kapatılıyor...');

        let resolved = false;
        const resolveOnce = () => {
          if (!resolved) {
            resolved = true;
            this.djangoServer = null;
            resolve();
          }
        };

        // Set a timeout for force kill
        const timeout = setTimeout(() => {
          if (this.djangoServer && this.djangoServer.pid) {
            console.log('Django Server zorla kapatılıyor...');
            try {
              treeKill(this.djangoServer.pid, 'SIGKILL', (err) => {
                if (err) {
                  console.error('Django Server force kill hatası:', err);
                } else {
                  console.log('Django Server zorla kapatıldı');
                }
                resolveOnce();
              });
            } catch (error) {
              console.error('Force kill attempt failed:', error);
              resolveOnce();
            }
          } else {
            resolveOnce();
          }
        }, 5000);

        // Listen for close event
        this.djangoServer.on('close', (code) => {
          console.log(`Django Server kapandı, kod: ${code}`);
          clearTimeout(timeout);
          resolveOnce();
        });

        this.djangoServer.on('error', (error) => {
          console.error('Django Server kapatılırken hata:', error);
          clearTimeout(timeout);
          resolveOnce();
        });

        // Try graceful shutdown
        if (this.djangoServer.pid) {
          try {
            // Check if process exists before trying to kill it
            process.kill(this.djangoServer.pid, 0); // This throws if process doesn't exist
            process.kill(this.djangoServer.pid, 'SIGTERM');
          } catch (error: any) {
            if (error.code === 'ESRCH') {
              console.log('Django Server process already terminated');
              clearTimeout(timeout);
              resolveOnce();
            } else {
              console.error('Django Server SIGTERM gönderilirken hata:', error);
              // Try force kill immediately
              if (this.djangoServer.pid) {
                try {
                  treeKill(this.djangoServer.pid, 'SIGKILL', () => {
                    clearTimeout(timeout);
                    resolveOnce();
                  });
                } catch (killError) {
                  console.error('Force kill failed:', killError);
                  clearTimeout(timeout);
                  resolveOnce();
                }
              } else {
                clearTimeout(timeout);
                resolveOnce();
              }
            }
          }
        } else {
          clearTimeout(timeout);
          resolveOnce();
        }
      } else {
        resolve();
      }
    });
  }

  setWindowTitle(window: BrowserWindow) {
    window.on('page-title-updated', (e) => e.preventDefault());
    window.setTitle(`Offboard Studio App - v${packageJson.version}`);
  }

  addWindowToWindowsMap(key: string, window: BrowserWindow) {
    this.windows[key] = window;
  }

  removeWindowFromWindowsMap(key: string) {
    this.windows[key] = null;
  }

  // NSRangeException hatası için güvenli ekran kontrolü
  getSafeDisplayBounds() {
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();

      if (!displays || displays.length === 0) {
        // Fallback varsayılan değerler
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
      // Güvenli fallback değerler
      return {
        x: 0,
        y: 0,
        width: 1424,
        height: 1028,
        workAreaSize: { width: 1424, height: 1028 },
      };
    }
  }

  // Pencere boyutlarını güvenli şekilde hesapla
  getSafeWindowBounds(
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

  async createMainWindow() {
    const getAssetPath = (...paths: string[]): string => {
      return path.join(this.RESOURCES_PATH, ...paths);
    };

    // Güvenli pencere boyutları al
    const windowBounds = this.getSafeWindowBounds(1424, 1028);
    //   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    //   callback({
    //     responseHeaders: {
    //       ...details.responseHeaders,
    //       'Content-Security-Policy': [
    //         "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net;"
    //       ]
    //     }
    //   });
    // });

    // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    //   callback({
    //     responseHeaders: {
    //       ...details.responseHeaders,
    //       'Content-Security-Policy': [
    //         "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "img-src 'self' data: blob: https:; " +
    //           "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    //           "worker-src 'self' blob: data:;",
    //       ],
    //     },
    //   });
    // });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            // Allow self, inline scripts/styles, eval, and data/blob URLs
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: " +
            // CDN domains for scripts/libraries
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
            // Script sources - allows Monaco Editor and other external scripts
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
            // Script element sources - specifically for <script> tags
            "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' " +
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
            // Connection sources - allows API calls
            "connect-src 'self' " +
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com ' +
            'https://openrouter.ai https://api.openai.com ' +
            'http://127.0.0.1:* http://localhost:* ' +
            'ws://127.0.0.1:* ws://localhost:* ' +
            'wss://127.0.0.1:* wss://localhost:* ' +
            'https://offboard-studio-backend.vercel.app; ' + // ← şimdi doğru yerde

            // Image sources - allows all HTTPS images
            "img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*; " +
            // Style sources - allows external stylesheets
            "style-src 'self' 'unsafe-inline' " +
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
            // Font sources - allows external fonts
            "font-src 'self' data: " +
            'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
            // Worker sources - for web workers
            "worker-src 'self' blob: data:; " +
            // Media sources - for audio/video
            "media-src 'self' blob: data:; " +
            // Object sources - for plugins
            "object-src 'none'; " +
            // Frame sources - for iframes
            "frame-src 'self'; " +
            // Child sources - for workers and frames
            "child-src 'self' blob:;",
          ],
        },
      });
    });

    const mainWindow = new BrowserWindow({
      show: false,
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      icon: getAssetPath('icon.png'),
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
        contextIsolation: true,
        nodeIntegration: true,
        // Swagger uyumluluğu için ek ayarlar
        webSecurity: false, // Swagger için gerekli
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        // DevTools için güvenli ayarlar
        devTools: process.env.NODE_ENV === 'development',
      },
      // NSRangeException hatası için ek güvenlik önlemleri
      minWidth: 800,
      minHeight: 600,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
    });

    this.addWindowToWindowsMap(this.MAIN_WINDOW_KEY, mainWindow);
    this.setWindowTitle(mainWindow);

    // Pencere kapatma eventini dinle
    mainWindow.on('close', async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.isQuitting = true;

        console.log('Uygulama kapatılıyor, serverlar durduruluyor...');

        // Tüm server'ları kapat
        await Promise.all([this.closeDjangoServer()]);

        console.log("Tüm server'lar kapatıldı, uygulama kapatılıyor...");
        app.quit();
      }
    });

    // Pencere olayları için hata yakalama
    mainWindow.on('ready-to-show', () => {
      try {
        const localMainWindow = this.windows[this.MAIN_WINDOW_KEY];

        if (!localMainWindow) {
          throw new Error('"mainWindow" is not defined');
        }

        if (process.env.START_MINIMIZED) {
          localMainWindow.minimize();
        } else {
          localMainWindow.show();
          // Güvenli fokus
          localMainWindow.focus();
        }
      } catch (error) {
        console.error('Pencere gösterilirken hata:', error);
      }
    });

    mainWindow.on('closed', () => {
      this.removeWindowFromWindowsMap(this.MAIN_WINDOW_KEY);
    });

    // Swagger için güvenli pencere boyutlandırma
    mainWindow.on('will-resize', (event, newBounds) => {
      try {
        const safeBounds = this.getSafeDisplayBounds();

        // Boyutları kontrol et ve gerekirse düzelt
        if (
          newBounds.width > safeBounds.workAreaSize.width ||
          newBounds.height > safeBounds.workAreaSize.height
        ) {
          event.preventDefault();

          mainWindow.setBounds({
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

    // Pencere boyutlandırma hatalarını yakala
    mainWindow.on('resize', () => {
      try {
        const bounds = mainWindow.getBounds();
        const safeBounds = this.getSafeDisplayBounds();

        // Güvenli sınırlar içinde mi kontrol et
        if (
          bounds.width > safeBounds.workAreaSize.width ||
          bounds.height > safeBounds.workAreaSize.height
        ) {
          mainWindow.setBounds({
            width: Math.min(bounds.width, safeBounds.workAreaSize.width),
            height: Math.min(bounds.height, safeBounds.workAreaSize.height),
          });
        }
      } catch (error) {
        console.error('Pencere yeniden boyutlandırılırken hata:', error);
      }
    });

    // Ekran değişikliklerini dinle
    screen.on('display-added', () => {
      console.log('Yeni ekran eklendi');
    });

    screen.on('display-removed', () => {
      console.log('Ekran çıkarıldı - pencere pozisyonu kontrol ediliyor');
      try {
        const safeBounds = this.getSafeDisplayBounds();
        mainWindow.setBounds({
          x: safeBounds.x,
          y: safeBounds.y,
          width: Math.min(mainWindow.getBounds().width, safeBounds.width),
          height: Math.min(mainWindow.getBounds().height, safeBounds.height),
        });
      } catch (error) {
        console.error(
          'Ekran çıkarıldıktan sonra pencere pozisyonu ayarlanırken hata:',
          error
        );
      }
    });

    // Swagger ile uyumluluk için webSecurity'yi devre dışı bırak
    // mainWindow.webContents.session.webRequest.onHeadersReceived(
    //   (details, callback) => {
    //     callback({
    //       responseHeaders: {
    //         ...details.responseHeaders,
    //         'Content-Security-Policy': [
    //           "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    //         ],
    //       },
    //     });
    //   }
    // );

    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              // Allow self, inline scripts/styles, eval, and data/blob URLs
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: " +
              // CDN domains for scripts/libraries
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
              // Script sources - allows Monaco Editor and other external scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
              // Script element sources - specifically for <script> tags
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' " +
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
              // Connection sources - allows API calls
              "connect-src 'self' " +
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com ' +
              'https://openrouter.ai https://api.openai.com ' +
              'http://127.0.0.1:* http://localhost:* ' +
              'ws://127.0.0.1:* ws://localhost:* ' +
              'wss://127.0.0.1:* wss://localhost:* ' +
              'https://offboard-studio-backend.vercel.app; ' + // ← şimdi doğru yerde
              // Image sources - allows all HTTPS images
              "img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*; " +
              // Style sources - allows external stylesheets
              "style-src 'self' 'unsafe-inline' " +
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
              // Font sources - allows external fonts
              "font-src 'self' data: " +
              'https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; ' +
              // Worker sources - for web workers
              "worker-src 'self' blob: data:; " +
              // Media sources - for audio/video
              "media-src 'self' blob: data:; " +
              // Object sources - for plugins
              "object-src 'none'; " +
              // Frame sources - for iframes
              "frame-src 'self'; " +
              // Child sources - for workers and frames
              "child-src 'self' blob:;",
            ],
          },
        });
      }
    );

    // URL yükleme işlemini güvenli hale getir
    mainWindow.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(
          `URL yükleme hatası: ${errorCode} - ${errorDescription} - ${validatedURL}`
        );
      }
    );

    // Swagger için güvenli yükleme
    mainWindow.webContents.on('dom-ready', () => {
      try {
        // DOM hazır olduğunda developer tools'u aç
        if (process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            try {
              mainWindow.webContents.openDevTools({ mode: 'detach' });
            } catch (devToolsError) {
              console.error('DevTools açılırken hata:', devToolsError);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('DOM ready event hatası:', error);
      }
    });

    // Swagger ile ilgili console mesajlarını yakala
    mainWindow.webContents.on(
      'console-message',
      (event, level, message, line, sourceId) => {
        // console.log(
        //   `Console Message [${level}]: ${message} (Line: ${line}, Source: ${sourceId})`
        // );
        if (message.includes('swagger') || message.includes('OpenAPI')) {
          console.log(`Swagger Console [${level}]: ${message}`);
        }
      }
    );

    mainWindow.loadURL(this.INDEX_HTML_PATH);

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

  /**
   * Set the port for the Django server
   * @default 8000
   */
  djangoServerPort = process.env.DJANGO_SERVER_PORT || 5000;

  /**
   * Send a healthcheck request to the API every certain amount of time until it gets a
   * positive response, indicating that the API is active.
   * @param retries Maximum number of requests to be sent
   * @param delay Time to wait between each request
   */
  waitForDjangoServer = async (retries: number = 30, delay: number = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(
          'http://127.0.0.1:' +
          this.djangoServerPort.toString() +
          '/api/healthcheck',
          {
            withCredentials: false, // Change to false for local development
            timeout: 3000, // Add timeout
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.status === 200) {
          console.log('Django Server is available');
          return;
        }
      } catch (error: any) {
        // More detailed error logging
        if (error.response) {
          console.log(
            `Attempt ${i + 1}: Django Server responded with status ${error.response.status
            }. Retrying...`
          );
        } else if (error.code === 'ECONNREFUSED') {
          console.log(
            `Attempt ${i + 1
            }: Django Server connection refused. Server may still be starting. Retrying...`
          );
        } else {
          console.log(
            `Attempt ${i + 1}: Django Server health check failed: ${error.message
            }. Retrying...`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(
      'Django Server did not become available within the expected time.'
    );
  };

  /**
   * Initialize the API and wait until it is active
   */

  runDjangoServer = async () => {
    const venvPath =
      os.platform() === 'win32'
        ? path.join(this.getBoardAPI(), 'venv', 'Scripts', 'python')
        : path.join(this.getBoardAPI(), 'venv', 'bin', 'python');

    console.log('venvPath', venvPath);
    console.log('getBoardAPI', this.getBoardAPI());

    // Add environment variables for Django
    const env = {
      ...process.env,
      DJANGO_SETTINGS_MODULE: 'your_project.settings', // Replace with your actual settings module
      PYTHONPATH: this.getBoardAPI(),
      // Allow all hosts for development
      DJANGO_ALLOWED_HOSTS: '127.0.0.1,localhost',
      // Disable CSRF for local development if needed
      DJANGO_DEBUG: 'True',
    };

    this.djangoServer = spawn(
      venvPath,
      [
        'manage.py',
        'runserver',
        `127.0.0.1:${this.djangoServerPort}`, // Explicitly bind to 127.0.0.1
        '--noreload', // Prevent auto-reloading which can cause issues
        '--insecure', // Serve static files even if DEBUG=False
      ],
      {
        cwd: this.getBoardAPI().toString(),
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env,
      }
    );

    this.djangoServer.stdout.setEncoding('utf8');
    this.djangoServer.stderr.setEncoding('utf8');

    this.djangoServer?.stdout.on('data', (data) => {
      console.log(`Django stdout: ${data}`);
    });

    this.djangoServer?.stderr.on('data', (data) => {
      console.error(`Django stderr: ${data}`);
    });

    this.djangoServer?.on('error', (error) => {
      console.error('Django server başlatılırken hata oluştu:', error);
    });

    this.djangoServer?.on('close', (code) => {
      console.log(`Django Server exited with code ${code}`);
    });

    // Wait a bit before starting health checks to let Django fully start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await this.waitForDjangoServer();
  };

  addAppEventListeners() {
    // Before-quit event'ini dinle - bu daha erken tetiklenir
    app.on('before-quit', async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.isQuitting = true;

        console.log("Uygulama kapatılıyor, server'lar durduruluyor...");

        try {
          // Tüm server'ları paralel olarak kapat
          // await Promise.all([this.closeDjangoServer()]);
          await Promise.all([this.closeServer(), this.closeDjangoServer()]);

          console.log("Tüm server'lar başarıyla kapatıldı");
        } catch (error) {
          console.error("Server'lar kapatılırken hata:", error);
        }

        // Server'lar kapandıktan sonra uygulamayı kapat
        app.quit();
      }
    });

    // Quit event'i için backup
    app.on('quit', async () => {
      if (!this.isQuitting) {
        this.isQuitting = true;

        // Son çare olarak server'ları kapat
        await Promise.all([this.closeServer(), this.closeDjangoServer()]);
      }
    });

    app.on('window-all-closed', async () => {
      // Respect the OSX convention of having the application in memory even
      // after all windows have been closed
      if (process.platform !== 'darwin') {
        if (!this.isQuitting) {
          this.isQuitting = true;

          console.log("Tüm pencereler kapatıldı, server'lar durduruluyor...");

          try {
            await Promise.all([this.closeServer(), this.closeDjangoServer()]);
            console.log("Server'lar kapatıldı, uygulama sonlandırılıyor");
          } catch (error) {
            console.error("Server'lar kapatılırken hata:", error);
          }

          app.quit();
        }
      }
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (this.windows[this.MAIN_WINDOW_KEY] === null) {
        this.createMainWindow();
      }
    });

    // Process signal'larını dinle
    process.on('SIGTERM', async () => {
      console.log('SIGTERM alındı, graceful shutdown yapılıyor...');
      if (!this.isQuitting) {
        this.isQuitting = true;
        await Promise.all([this.closeServer(), this.closeDjangoServer()]);
        process.exit(0);
      }
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT alındı, graceful shutdown yapılıyor...');
      if (!this.isQuitting) {
        this.isQuitting = true;
        await Promise.all([this.closeServer(), this.closeDjangoServer()]);
        process.exit(0);
      }
    });
  }

  openNewWindow(url: string, windowKey: string) {
    // Güvenli pencere boyutları al
    const windowBounds = this.getSafeWindowBounds(1024, 728);

    const newWindow = new BrowserWindow({
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      webPreferences: {
        preload: this.PRELOAD_SCRIPT,
        contextIsolation: true,
        nodeIntegration: true,
        // Swagger uyumluluğu için ek ayarlar
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

      // Ekran bilgilerini kontrol et
      try {
        const displays = screen.getAllDisplays();
        console.log(`Mevcut ekran sayısı: ${displays.length}`);
        displays.forEach((display, index) => {
          console.log(
            `Ekran ${index}: ${display.bounds.width}x${display.bounds.height}`
          );
        });
      } catch (error) {
        console.error('Ekran bilgileri alınırken hata:', error);
      }

      const url = resolveHtmlPath('index.html');

      if (url.startsWith('http://')) {
        const net = require('net');
        const port = parseInt(process.env.PORT || '3001');

        const isAlive = await new Promise<boolean>((resolve) => {
          const client = net.createConnection({ port }, () => {
            client.end();
            resolve(true);
          });
          client.on('error', () => resolve(false));
        });

        if (!isAlive) {
          console.error(
            `❌ Vite dev server not running at port ${port}. Exiting Electron...`
          );
          setTimeout(() => {
            app.quit(); // Bazı sistemlerde aniden çağrıldığında çalışmayabilir, bu yüzden minik delay
          }, 500);
          return;
        }

        console.log(`✅ Vite dev server is alive at http://localhost:${port}`);
      }

      this.addIPCRenderEventListeners();
      await this.createMainWindow();
      this.createServer();

      if (app.isPackaged && process.env.NODE_ENV !== 'development') {
        // Migrate if we are on the production server
        // await migrateDatabase();
      }

      // Start the Django server
      // await this.runDjangoServer();
    } catch (err) {
      console.error('Error: setting up app - ', err);

      app.quit();
    }
  }
}

new ElectronApp();
