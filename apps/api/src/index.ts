/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3333;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

export class ServerController {
  private app!: INestApplication;
  private readonly globalPrefix = 'api';
  private readonly port =3333;

  async createServer(): Promise<void> {
    this.app = await NestFactory.create(AppModule);
    this.app.setGlobalPrefix(this.globalPrefix);
    await this.app.listen(this.port);
    Logger.log(
      `🚀 Application is running on: http://localhost:${this.port}/${this.globalPrefix}`
    );
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
      Logger.log('🛑 Application has been stopped.');
    }
  }
}
