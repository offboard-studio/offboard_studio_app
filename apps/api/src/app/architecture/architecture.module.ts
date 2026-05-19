import { Module } from '@nestjs/common';

import { ArchitectureController } from './architecture.controller';
import { ArchitectureGateway } from './architecture.gateway';
import { ArchitectureService } from './architecture.service';

@Module({
  controllers: [ArchitectureController],
  providers: [ArchitectureService, ArchitectureGateway],
  exports: [ArchitectureService],
})
export class ArchitectureModule {}
