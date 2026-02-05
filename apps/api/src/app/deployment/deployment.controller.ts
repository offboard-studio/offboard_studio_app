import { Controller, Post, Body, Logger, HttpException, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeploymentService } from './deployment.service';
import { DeployConfigDto } from './dto/deployment.dto';

@ApiTags('Deployment')
@Controller('deployment')
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  // Simple rate limiting - track last request time per host
  private lastRequestTime: Map<string, number> = new Map();
  private readonly rateLimitMs = 5000; // 5 seconds between requests to same host

  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Execute deployment commands on remote server via SSH' })
  @ApiResponse({ status: 200, description: 'Deployment executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Deployment failed' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async runDeployment(@Body() config: DeployConfigDto) {
    const host = config.ssh.host;

    // Validate that either password or privateKeyPath is provided
    if (!config.ssh.password && !config.ssh.privateKeyPath) {
      throw new HttpException(
        'Either password or privateKeyPath must be provided for SSH authentication',
        HttpStatus.BAD_REQUEST
      );
    }

    // Simple rate limiting
    const lastRequest = this.lastRequestTime.get(host);
    const now = Date.now();
    if (lastRequest && now - lastRequest < this.rateLimitMs) {
      throw new HttpException(
        `Please wait before making another deployment request to ${host}`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    this.lastRequestTime.set(host, now);

    // Validate commands for potentially dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\/(?!\w)/i, // rm -rf / (root)
      /:\(\)\s*{\s*:\|:\s*&\s*}\s*;/i, // fork bomb
      />\s*\/dev\/sd[a-z]/i, // overwrite disk
      /mkfs\./i, // format filesystem
    ];

    for (const cmd of config.commands) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(cmd)) {
          this.logger.warn(`Blocked potentially dangerous command: ${cmd}`);
          throw new HttpException(
            'Command contains potentially dangerous patterns',
            HttpStatus.BAD_REQUEST
          );
        }
      }
    }

    this.logger.log(`Received deployment request for ${host}`);

    try {
      const logs = await this.deploymentService.executeDeployment(config);
      return {
        success: true,
        logs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Deployment failed', errorMessage);
      throw new HttpException(
        {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
