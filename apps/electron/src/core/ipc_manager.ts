import { ipcMain, IpcMainEvent, dialog } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { ServerManager } from './server_manager';
import { WindowManager } from './window_manager';

export class IPCManager {
  constructor(
    private serverManager: ServerManager,
    private windowManager?: WindowManager
  ) { }

  setupIPCHandlers(): void {
    this.setupWindowHandlers();
    this.setupFileHandlers();
  }

  private setupWindowHandlers(): void {
    ipcMain.on('open-new-window', (_event: IpcMainEvent, url: string, windowKey: string) => {
      this.windowManager?.openNewWindow(url, windowKey);
    });
  }

  private setupFileHandlers(): void {
    // File download handler
    ipcMain.handle('download-file', async (event, { buffer, filename, defaultPath }) => {
      try {
        const result = await dialog.showSaveDialog({
          title: 'Save Project',
          defaultPath: defaultPath || filename,
          properties: ['createDirectory'],
          filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'Project Files', extensions: ['json', 'js', 'ts'] },
            { name: 'Archive Files', extensions: ['tar', 'gz', 'rar'] }
          ]
        });

        if (result.canceled) {
          return { success: false, error: 'Save cancelled by user' };
        }

        const fileBuffer = Buffer.from(buffer);

        this.serverManager.processFileViaIPC(buffer, filename)
          .then((response) => {
            console.log('File processed successfully via IPC:', response);
          })
          .catch((error) => {
            console.error('Error processing file via IPC:', error);
            return { success: false, error: error.message || 'Unknown error occurred during IPC processing' };
          });

        if (!result.filePath) {
          return { success: false, error: 'No file path selected' };
        }

        const dir = path.dirname(result.filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(result.filePath, fileBuffer);

        console.log(`File saved successfully to: ${result.filePath}`);
        return { success: true, filePath: result.filePath };

      } catch (error: unknown) {
        console.error('Download error:', error);
        return {
          success: false,
          error: (error as Error).message || 'Unknown error occurred'
        };
      }
    });

    // AI build sync handler
    ipcMain.handle('ai-build-sync', async (event, { buffer, filename, defaultPath }) => {
      try {
        const result = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Ollama', 'MCP', 'OpenAI', 'İptal'],
          title: 'Format Seç',
          message: 'Hangi dosya formatını seçmek istiyorsunuz?',
          defaultId: 0,
          cancelId: 3
        });

        if (result.response === 3) {
          return { success: false, error: 'Save cancelled by user' };
        }

        this.serverManager.aiBuildSync(buffer, filename)
          .then((response) => {
            console.log('File processed successfully via IPC:', response);
          })
          .catch((error) => {
            console.error('Error processing file via IPC:', error);
            return {
              success: false,
              error: error.message || 'Unknown error occurred during IPC processing'
            };
          });

        console.log(`File saved successfully to: ${result.response}`);
        return { success: true, filePath: result.response };

      } catch (error: unknown) {
        console.error('Download error:', error);
        return {
          success: false,
          error: (error as Error).message || 'Unknown error occurred'
        };
      }
    });

    // Direct file save handler
    ipcMain.handle('save-file-direct', async (event, { buffer, filePath }) => {
      try {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path provided');
        }

        const fileBuffer = Buffer.from(buffer);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, fileBuffer);

        console.log(`File saved directly to: ${filePath}`);
        return { success: true, filePath: filePath };

      } catch (error) {
        console.error('Direct save error:', error);
        return {
          success: false,
          error: (error instanceof Error ? error.message : 'Unknown error occurred')
        };
      }
    });
  }
}
