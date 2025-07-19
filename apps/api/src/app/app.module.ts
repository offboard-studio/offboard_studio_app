// import { AppController } from '@api';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppIPCService } from './app-ipc.service';
import { AppSingleton } from './app.singleton';
import { AppController2,AppService2 } from '@ai-modules';

@Module({
  imports: [],
  controllers: [AppController, AppController2],
  providers: [AppService, AppIPCService, AppSingleton, AppService2],
  exports: [AppService, AppIPCService, AppSingleton],
})
export class AppModule { }
