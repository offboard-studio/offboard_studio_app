/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
  private readonly port = 3333;

  async createServer(): Promise<void> {
    this.app = await NestFactory.create(AppModule);
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

    await this.app.listen(this.port);
    Logger.log(
      `🚀 Application is running on: http://localhost:${this.port}/${this.globalPrefix}`
    );
  }

  async close(p0?: () => void): Promise<void> {
    if (this.app) {
      await this.app.close();
      Logger.log('🛑 Application has been stopped.');
    }
  }
}
