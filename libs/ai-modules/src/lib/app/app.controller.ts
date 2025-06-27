import { Controller, Get } from '@nestjs/common';

import { AppService2 } from './app.service';

@Controller()
export class AppController2 {
  constructor(private readonly appService: AppService2) {}

  @Get("/1")
  getData1() {
    return this.appService.getData();
  }
}
