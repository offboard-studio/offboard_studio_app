
import { Module } from '@nestjs/common';
import { DeploymentService } from './deployment.service';
import { DeploymentController } from './deployment.controller';

@Module({
  controllers: [DeploymentController],
  providers: [DeploymentService],
})
export class DeploymentModule {}
