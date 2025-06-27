import { Module } from '@nestjs/common';
import { AppController2} from './app/app.controller';
import { AppService2 } from './app/app.service';

@Module({

  controllers: [AppController2],
  providers: [AppService2],
  exports: [],
})
export class AiModulesModule { }
export * from './app/app.controller';
export * from './app/app.service';
