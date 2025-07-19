import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService2 {
  getData(): { message: string } {
    return { message: 'Welcome to api!' };
  }
}
