import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DeploymentController } from './deployment.controller';
import { DeploymentService } from './deployment.service';
import { DeployConfigDto } from './dto/deployment.dto';

describe('DeploymentController', () => {
  let controller: DeploymentController;
  let service: DeploymentService;

  beforeEach(async () => {
    const mockDeploymentService = {
      executeDeployment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploymentController],
      providers: [
        {
          provide: DeploymentService,
          useValue: mockDeploymentService,
        },
      ],
    }).compile();

    controller = module.get<DeploymentController>(DeploymentController);
    service = module.get<DeploymentService>(DeploymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('runDeployment', () => {
    it('should throw error when no authentication method is provided', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
        },
        commands: ['ls'],
      };

      await expect(controller.runDeployment(config)).rejects.toThrow(
        HttpException
      );
    });

    it('should execute deployment with password auth', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
          password: 'password',
        },
        commands: ['ls', 'pwd'],
      };

      jest.spyOn(service, 'executeDeployment').mockResolvedValue([
        'SSH Connection established.',
        '> ls',
        'file1 file2',
        'Command exited with code 0',
      ]);

      const result = await controller.runDeployment(config);

      expect(result.success).toBe(true);
      expect(result.logs).toBeDefined();
      expect(result.executedAt).toBeDefined();
    });

    it('should execute deployment with private key auth', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
          privateKeyPath: '/home/user/.ssh/id_rsa',
        },
        commands: ['ls'],
      };

      jest.spyOn(service, 'executeDeployment').mockResolvedValue([
        'SSH Connection established.',
        '> ls',
        'Command exited with code 0',
      ]);

      const result = await controller.runDeployment(config);

      expect(result.success).toBe(true);
    });

    it('should block dangerous commands', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
          password: 'password',
        },
        commands: ['rm -rf /'],
      };

      await expect(controller.runDeployment(config)).rejects.toThrow(
        HttpException
      );
    });

    it('should enforce rate limiting', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
          password: 'password',
        },
        commands: ['ls'],
      };

      jest.spyOn(service, 'executeDeployment').mockResolvedValue(['done']);

      // First request should succeed
      await controller.runDeployment(config);

      // Second immediate request should fail due to rate limiting
      await expect(controller.runDeployment(config)).rejects.toThrow(
        HttpException
      );
    });

    it('should handle deployment errors', async () => {
      const config: DeployConfigDto = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
          password: 'password',
        },
        commands: ['ls'],
      };

      // Wait for rate limit to expire
      await new Promise((resolve) => setTimeout(resolve, 5100));

      jest
        .spyOn(service, 'executeDeployment')
        .mockRejectedValue(new Error('Connection refused'));

      await expect(controller.runDeployment(config)).rejects.toThrow(
        HttpException
      );
    });
  });
});
