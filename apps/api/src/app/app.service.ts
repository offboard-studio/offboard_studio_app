/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProcessFileDto, SaveFileDto, FileValidationDto, FileResponseDto } from './dto/app.dto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World!';
  }



  // File processing methods
  async hookToJsonServer(processFileDto: ProcessFileDto): Promise<FileResponseDto> {
    try {
      const { buffer, filename, metadata } = processFileDto;
      
      // Convert base64 string back to buffer
      const fileBuffer = Buffer.from(buffer, 'base64');
      
      this.logger.log(`Processing file: ${filename}, size: ${fileBuffer.length} bytes`);

      // File validation
      const validation = await this.validateFileBuffer(fileBuffer, filename);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.error}`);
      }

      // Process the file based on its type
      const processed = await this.processFileByType(fileBuffer, filename, metadata);

      // Save to temporary location for further processing
      const tempPath = path.join(os.tmpdir(), 'offboard-studio', filename);
      await this.ensureDirectoryExists(path.dirname(tempPath));
      await fs.writeFile(tempPath, fileBuffer);

      return {
        success: true,
        filename,
        size: fileBuffer.length,
        tempPath,
        processedData: processed,
        timestamp: new Date().toISOString(),
      };

    } catch (error: Error | unknown) {
      this.logger.error(`File processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // File processing methods
  async processDownloadData(processFileDto: ProcessFileDto): Promise<FileResponseDto> {
    try {
      const { buffer, filename, metadata } = processFileDto;
      
      // Convert base64 string back to buffer
      const fileBuffer = Buffer.from(buffer, 'base64');
      
      this.logger.log(`Processing file: ${filename}, size: ${fileBuffer.length} bytes`);

      // File validation
      const validation = await this.validateFileBuffer(fileBuffer, filename);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.error}`);
      }

      // Process the file based on its type
      const processed = await this.processFileByType(fileBuffer, filename, metadata);

      // Save to temporary location for further processing
      const tempPath = path.join(os.tmpdir(), 'offboard-studio', filename);
      await this.ensureDirectoryExists(path.dirname(tempPath));
      await fs.writeFile(tempPath, fileBuffer);

      return {
        success: true,
        filename,
        size: fileBuffer.length,
        tempPath,
        processedData: processed,
        timestamp: new Date().toISOString(),
      };

    } catch (error: Error | unknown) {
      this.logger.error(`File processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async saveFileWithDialog(saveFileDto: SaveFileDto): Promise<FileResponseDto> {
    try {
      const { buffer, filename, targetPath, metadata } = saveFileDto;
      
      // Convert base64 string back to buffer
      const fileBuffer = Buffer.from(buffer, 'base64');
      
      // Use provided target path
      const finalPath = targetPath;
      
      await this.ensureDirectoryExists(path.dirname(finalPath));
      await fs.writeFile(finalPath, fileBuffer);

      this.logger.log(`File saved to: ${finalPath}`);

      return {
        success: true,
        filename,
        size: fileBuffer.length,
        savePath: finalPath,
        timestamp: new Date().toISOString(),
      };

    } catch (error: Error | unknown) {
      this.logger.error(`File save failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async validateFileData(validationDto: FileValidationDto) {
    try {
      const { buffer, filename } = validationDto;
      const fileBuffer = Buffer.from(buffer, 'base64');
      return await this.validateFileBuffer(fileBuffer, filename);
    } catch (error: Error | unknown) {
      this.logger.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Private helper methods
  private async validateFileBuffer(buffer: Buffer, filename: string) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = ['.zip', '.json', '.js', '.ts', '.tar', '.gz', '.rar'];

    if (buffer.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    if (buffer.length > maxSize) {
      return { isValid: false, error: 'File size exceeds maximum limit' };
    }

    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { isValid: false, error: `File type ${ext} not allowed` };
    }

    // Basic file signature check
    const signature = buffer.toString('hex', 0, 4);
    const validSignatures = {
      '504b0304': 'ZIP',
      '504b0506': 'ZIP',
      '504b0708': 'ZIP',
      '1f8b0800': 'GZIP',
    };

    return { 
      isValid: true, 
      fileType:" validSignatures[signature] || 'UNKNOWN'",
      size: buffer.length,
      signature 
    };
  }

  private async processFileByType(buffer: Buffer, filename: string, metadata?: any) {
    const ext = path.extname(filename).toLowerCase();

    try {
      switch (ext) {
        case '.json':
          return this.processJsonFile(buffer);
        case '.zip':
          return this.processZipFile(buffer);
        case '.js':
        case '.ts':
          return this.processCodeFile(buffer, ext);
        default:
          return this.processGenericFile(buffer, filename);
      }
    } catch (error) {
      this.logger.warn(`File type processing failed for ${ext}, using generic processing`);
      return this.processGenericFile(buffer, filename);
    }
  }

  private processJsonFile(buffer: Buffer) {
    try {
      const content = buffer.toString('utf8');
      const parsed = JSON.parse(content);
      return {
        type: 'json',
        valid: true,
        structure: Object.keys(parsed),
        size: Object.keys(parsed).length,
      };
    } catch (error: Error | unknown) {
      return {
        type: 'json',
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private processZipFile(buffer: Buffer) {
    return {
      type: 'zip',
      compressed: true,
      size: buffer.length,
      // Additional ZIP processing logic can be added here
    };
  }

  private processCodeFile(buffer: Buffer, extension: string) {
    const content = buffer.toString('utf8');
    const lines = content.split('\n');

    return {
      type: 'code',
      language: extension.substring(1),
      lines: lines.length,
      characters: content.length,
      hasImports: content.includes('import ') || content.includes('require('),
    };
  }

  private processGenericFile(buffer: Buffer, filename: string) {
    return {
      type: 'generic',
      filename,
      size: buffer.length,
      timestamp: new Date().toISOString(),
    };
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: Error | unknown) {
      if (!(error && typeof error === 'object' && 'code' in error && (error as any).code === 'EEXIST')) {
        throw error;
      }
    }
  }

  getData(): { message: string } {
    return { message: 'Welcome to api!' };
  }
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
  getVersion(): { version: string } {
    return { version: '0.0.1' };
  }
  getStatus(): { status: string } {
    return { status: 'running' };
  }
  getInfo(): { info: string } {
    return { info: 'This is the API service for Offboard Studio.' };
  }
  getAbout(): { about: string } {
    return { about: 'Offboard Studio is a platform for managing and processing data.' };
  }
  getDocs(): { docs: string } {
    return { docs: 'https://docs.offboardstudio.com' };
  }
  getSupport(): { support: string } {
    return { support: 'https://support.offboardstudio.com' };
  }
  getContact(): { contact: string } {
    return { contact: 'https://contact.offboardstudio.com' };
  }
  getPrivacy(): { privacy: string } {
    return { privacy: 'https://privacy.offboardstudio.com' };
  }
  getTerms(): { terms: string } {
    return { terms: 'https://terms.offboardstudio.com' };
  }
}