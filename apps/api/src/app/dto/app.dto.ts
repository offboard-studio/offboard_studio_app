/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ProcessFileDto {
  buffer: string; // base64 encoded
  filename: string;
  metadata?: {
    source?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface SaveFileDto {
  buffer: string; // base64 encoded
  filename: string;
  targetPath: string;
  metadata?: {
    source?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface FileValidationDto {
  buffer: string; // base64 encoded
  filename: string;
}

export interface FileResponseDto {
  success: boolean;
  filename: string;
  size: number;
  tempPath?: string;
  savePath?: string;
  processedData?: any;
  timestamp: string;
}