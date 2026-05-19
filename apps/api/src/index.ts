/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { AppIPCService } from './app/app-ipc.service';

export class ServerController {
  private app!: INestApplication;
  private readonly globalPrefix = 'api';
  private readonly port = 3333;
  private appIPCService: AppIPCService | null = null;

  async createServer(): Promise<void> {
    try {
      console.log('🚀 Creating NestJS application...');

      this.app = await NestFactory.create(AppModule);
      console.log('✅ NestJS application created');

      this.app.enableCors({ origin: true, credentials: false });
      this.app.setGlobalPrefix(this.globalPrefix);

      const config = new DocumentBuilder()
        .setTitle('Offboard Studio Swagger')
        .setDescription('The Offboard Studio API description')
        .setVersion('0.0.0')
        .addTag('offboard-studio')
        .build();

      const documentFactory = () =>
        SwaggerModule.createDocument(this.app, config);
      SwaggerModule.setup('docs', this.app, documentFactory());

      console.log('🌐 Starting server...');
      await this.app.listen(this.port);

      Logger.log(
        `🚀 Application is running on: http://localhost:${this.port}/${this.globalPrefix}`
      );

      // Initialize AppIPCService
      await this.initializeServices();

    } catch (error: Error | unknown) {
      Logger.error('❌ Failed to create NestJS server:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      } else {
        console.error('Stack trace: Unknown error type');
      }
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      console.log('🔧 Initializing AppIPC services...');

      // Wait for application to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get AppIPCService
      this.appIPCService = this.app.get(AppIPCService);

      if (this.appIPCService) {
        Logger.log('📡 AppIPC Service is ready for direct communication');
      } else {
        Logger.warn('⚠️ AppIPCService not available');
      }

    } catch (error: Error | unknown) {
      Logger.error('❌ Failed to initialize AppIPC services:', error);
      console.error('Service initialization error:', error instanceof Error ? error.message : String(error));
      // Don't throw - let app continue with fallback
    }
  }

  getAppIPCService(): AppIPCService | null {
    return this.appIPCService;
  }

  isIPCServiceAvailable(): boolean {
    return this.appIPCService !== null;
  }

  async close(callback?: () => void): Promise<void> {
    if (this.app) {
      try {
        await this.app.close();
        Logger.log('🛑 Application has been stopped.');
        this.appIPCService = null;
      } catch (error) {
        Logger.error('❌ Error closing NestJS application:', error);
      }

      if (callback) callback();
    }
  }
}