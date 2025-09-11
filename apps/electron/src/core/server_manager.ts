import path from 'path';
import os from 'os';
import { app } from 'electron';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import axios from 'axios';
import treeKill from 'tree-kill';
import { ServerController } from '@api';

export class ServerManager {
  private server: ServerController | null = null;
  private djangoServer: ChildProcessWithoutNullStreams | null = null;
  private djangoServerPort = process.env.DJANGO_SERVER_PORT || 5000;

  createServer() {
    const { ServerController } = require('@api');
    const api = new ServerController();
    this.server = api;
    this.server?.createServer();
  }

  getAppIPCService(): any | null {
    return this.server?.getAppIPCService() || null;
  }

  async processFileViaIPC(buffer: ArrayBuffer, filename: string): Promise<any> {
    const appIPCService = this.getAppIPCService();

    if (!appIPCService) {
      throw new Error('AppIPCService not available');
    }

    try {
      return await appIPCService.processFileDirectly(buffer, filename);
    } catch (error) {
      console.error('Direct IPC file processing failed:', error);
      throw error;
    }
  }

  async aiBuildSync(buffer: string, filename: string): Promise<any> {
    const appIPCService = this.getAppIPCService();

    if (!appIPCService) {
      throw new Error('AppIPCService not available');
    }

    try {
      return await appIPCService.aiBuildSync(buffer, filename);
    } catch (error) {
      console.error('Direct IPC file processing failed:', error);
      throw error;
    }
  }

  async saveFileViaIPC(buffer: ArrayBuffer, filename: string, targetPath: string): Promise<any> {
    const appIPCService = this.getAppIPCService();

    if (!appIPCService) {
      throw new Error('AppIPCService not available');
    }

    try {
      return await appIPCService.saveFileDirectly(buffer, filename, targetPath);
    } catch (error) {
      console.error('Direct IPC file save failed:', error);
      throw error;
    }
  }

  async validateFileViaIPC(buffer: ArrayBuffer, filename: string): Promise<any> {
    const appIPCService = this.getAppIPCService();

    if (!appIPCService) {
      throw new Error('AppIPCService not available');
    }

    try {
      return await appIPCService.validateFileDirectly(buffer, filename);
    } catch (error) {
      console.error('Direct IPC file validation failed:', error);
      throw error;
    }
  }

  private getBoardAPI() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'board_api/api');
    }
    return path.join(__dirname, '../../../board_api/api');
  }

  async runDjangoServer(): Promise<void> {
    const venvPath = os.platform() === 'win32'
      ? path.join(this.getBoardAPI(), 'venv', 'Scripts', 'python')
      : path.join(this.getBoardAPI(), 'venv', 'bin', 'python');

    const env = {
      ...process.env,
      DJANGO_SETTINGS_MODULE: 'your_project.settings',
      PYTHONPATH: this.getBoardAPI(),
      DJANGO_ALLOWED_HOSTS: '127.0.0.1,localhost',
      DJANGO_DEBUG: 'True',
    };

    this.djangoServer = spawn(
      venvPath,
      [
        'manage.py',
        'runserver',
        `127.0.0.1:${this.djangoServerPort}`,
        '--noreload',
        '--insecure',
      ],
      {
        cwd: this.getBoardAPI().toString(),
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env,
      }
    );

    this.setupDjangoServerEventHandlers();
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.waitForDjangoServer();
  }

  private setupDjangoServerEventHandlers() {
    if (!this.djangoServer) return;

    this.djangoServer.stdout.setEncoding('utf8');
    this.djangoServer.stderr.setEncoding('utf8');

    this.djangoServer.stdout.on('data', (data) => {
      console.log(`Django stdout: ${data}`);
    });

    this.djangoServer.stderr.on('data', (data) => {
      console.error(`Django stderr: ${data}`);
    });

    this.djangoServer.on('error', (error) => {
      console.error('Django server başlatılırken hata oluştu:', error);
    });

    this.djangoServer.on('close', (code) => {
      console.log(`Django Server exited with code ${code}`);
    });
  }

  private async waitForDjangoServer(retries: number = 30, delay: number = 5000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(
          `http://127.0.0.1:${this.djangoServerPort}/api/healthcheck`,
          {
            withCredentials: false,
            timeout: 3000,
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
        console.log(`Attempt ${i + 1}: Django Server not ready. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Django Server did not become available within the expected time.');
  }

  async closeServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.log('NestJS Server kapatılıyor...');
        try {
          if (typeof this.server.close === 'function') {
            this.server.close(() => {
              console.log('NestJS Server başarıyla kapatıldı');
              this.server = null;
              resolve();
            });
          } else {
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

        if (this.djangoServer.pid) {
          try {
            process.kill(this.djangoServer.pid, 0);
            process.kill(this.djangoServer.pid, 'SIGTERM');
          } catch (error: any) {
            if (error.code === 'ESRCH') {
              console.log('Django Server process already terminated');
              clearTimeout(timeout);
              resolveOnce();
            } else {
              console.error('Django Server SIGTERM gönderilirken hata:', error);
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

  async closeAllServers(): Promise<void> {
    await Promise.all([this.closeServer(), this.closeDjangoServer()]);
  }
}