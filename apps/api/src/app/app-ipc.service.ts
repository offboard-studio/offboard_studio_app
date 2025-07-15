/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AppService } from './app.service';
 import { ProcessFileDto, SaveFileDto } from './dto/app.dto';
import { AppSingleton } from './app.singleton';

@Injectable()
export class AppIPCService extends EventEmitter {
  private readonly logger = new Logger(AppIPCService.name);

  constructor(private readonly appService: AppService, private readonly appSingleton: AppSingleton) {
    super();
    this.setupIPCHandlers();
  }

  private setupIPCHandlers() {
    // Listen for file processing requests
    this.on('process-file', async (data: { buffer: ArrayBuffer; filename: string; requestId: string }) => {
      try {
        this.logger.log(`Processing file via IPC: ${data.filename}`);

        const processFileDto: ProcessFileDto = {
          buffer: Buffer.from(data.buffer).toString('base64'),
          filename: data.filename,
          metadata: {
            source: 'electron-ipc-direct',
            timestamp: new Date().toISOString()
          }
        };

        const result = await this.appService.processDownloadData(processFileDto);

        // Emit success response
        this.emit('process-file-response', {
          requestId: data.requestId,
          success: true,
          data: result
        });

      } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`File processing failed: ${errorMessage}`);

        // Emit error response
        this.emit('process-file-response', {
          requestId: data.requestId,
          success: false,
          error: errorMessage
        });
      }
    });

    // Listen for file save requests
    this.on('save-file', async (data: { buffer: ArrayBuffer; filename: string; targetPath: string; requestId: string }) => {
      try {
        this.logger.log(`Saving file via IPC: ${data.filename} to ${data.targetPath}`);

        const saveFileDto: SaveFileDto = {
          buffer: Buffer.from(data.buffer).toString('base64'),
          filename: data.filename,
          targetPath: data.targetPath,
          metadata: {
            source: 'electron-ipc-direct',
            timestamp: new Date().toISOString()
          }
        };

        const result = await this.appService.saveFileWithDialog(saveFileDto);

        // Emit success response
        this.emit('save-file-response', {
          requestId: data.requestId,
          success: true,
          data: result
        });

      } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`File save failed: ${errorMessage}`);

        // Emit error response
        this.emit('save-file-response', {
          requestId: data.requestId,
          success: false,
          error: errorMessage
        });
      }
    });

    // Listen for file validation requests
    this.on('validate-file', async (data: { buffer: ArrayBuffer; filename: string; requestId: string }) => {
      try {
        this.logger.log(`Validating file via IPC: ${data.filename}`);

        const validation = await this.appService.validateFileData({
          buffer: Buffer.from(data.buffer).toString('base64'),
          filename: data.filename
        });

        // Emit success response
        this.emit('validate-file-response', {
          requestId: data.requestId,
          success: true,
          data: validation
        });

      } catch (error: Error | unknown) {
        this.logger.error(`File validation failed: ${error instanceof Error ? error.message : String(error)}`);

        // Emit error response
        this.emit('validate-file-response', {
          requestId: data.requestId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    this.logger.log('AppIPC Service initialized');
  }

  // Public methods for external access
  async processFileDirectly(buffer: ArrayBuffer, filename: string) {
    try {
      const processFileDto: ProcessFileDto = {
        buffer: Buffer.from(buffer).toString('base64'),
        filename,
        metadata: {
          source: 'direct-call',
          timestamp: new Date().toISOString()
        }
      };

      return await this.appService.processDownloadData(processFileDto);
    } catch (error: Error | unknown) {
      this.logger.error(`Direct file processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Public methods for external access
  async aiBuildSync(buffer: string, filename: string) {
    try {
      // const processFileDto: ProcessFileDto = {
      //   buffer: 
      //   filename,
      //   metadata: {
      //     source: 'direct-call',
      //     timestamp: new Date().toISOString()
      //   }
      // };

      this.appSingleton.setOnce('aiBuildSync', {
        buffer: buffer,
        filename,
        metadata: {
          source: 'direct-call',
          timestamp: new Date().toISOString()
        }
      });

      console.log('Processing JSON directly:', buffer, filename);

      // return buffer ? JSON.parse(buffer) : null;

      // return await this.appService.processDownloadData(processFileDto);
    } catch (error: Error | unknown) {
      this.logger.error(`Direct file processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async saveFileDirectly(buffer: ArrayBuffer, filename: string, targetPath: string) {
    try {
      const saveFileDto: SaveFileDto = {
        buffer: Buffer.from(buffer).toString('base64'),
        filename,
        targetPath,
        metadata: {
          source: 'direct-call',
          timestamp: new Date().toISOString()
        }
      };

      return await this.appService.saveFileWithDialog(saveFileDto);
    } catch (error: Error | unknown) {
      this.logger.error(`Direct file save failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async validateFileDirectly(buffer: ArrayBuffer, filename: string) {
    try {
      return await this.appService.validateFileData({
        buffer: Buffer.from(buffer).toString('base64'),
        filename
      });
    } catch (error) {
      this.logger.error(`Direct file validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}