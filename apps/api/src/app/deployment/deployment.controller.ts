
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { DeploymentService, DeployConfig } from './deployment.service';

@Controller('deployment')
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('run')
  async runDeployment(@Body() config: DeployConfig) {
    this.logger.log(`Received deployment request for ${config.ssh.host}`);
    try {
      const logs = await this.deploymentService.executeDeployment(config);
      return { success: true, logs };
    } catch (error: any) {
      this.logger.error('Deployment failed', error);
      return { success: false, error: error.message };
    }
  }
}
