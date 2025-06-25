// import { AppController } from '@api';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppIPCService } from './app-ipc.service';
import { AppSingleton } from './app.singleton';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AppIPCService, AppSingleton],
  exports: [AppService, AppIPCService, AppSingleton],
})
export class AppModule { }
