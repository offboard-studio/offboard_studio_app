import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { AppIPCService } from './app-ipc.service';
import { AppSingleton } from './app.singleton';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly appIPCService: AppIPCService, private readonly appSingleton: AppSingleton) { }

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }


  @Get('singleton-data')
  getSingletonData() {
    const data = this.appSingleton.getAll();
    return {
      status: 'Singleton Data',
      data: data
    };
  }





  @Get('ipc-status')
  getIPCStatus() {
    if (this.appIPCService) {
      return { status: 'IPC service is running' };
    } else {
      return { status: 'IPC service is not initialized' };
    }
  }
  @Get('ipc-test')
  testIPC() {
    if (this.appIPCService) {
      this.appIPCService.emit('process-file', {
        buffer: new ArrayBuffer(0), // Example buffer
        filename: 'test.txt',
        requestId: '12345'
      });
      return { status: 'IPC test message sent' };
    } else {
      return { status: 'IPC service is not initialized' };
    }
  }

}
