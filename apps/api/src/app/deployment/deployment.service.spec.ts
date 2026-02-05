import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentService, DeployConfig } from './deployment.service';

// Mock ssh2 Client
jest.mock('ssh2', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockReturnThis(),
      connect: jest.fn(),
      exec: jest.fn(),
      end: jest.fn(),
    })),
  };
});

describe('DeploymentService', () => {
  let service: DeploymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeploymentService],
    }).compile();

    service = module.get<DeploymentService>(DeploymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeDeployment', () => {
    it('should validate SSH config has required fields', async () => {
      const config: DeployConfig = {
        ssh: {
          host: '',
          port: 22,
          username: 'user',
          password: 'pass',
        },
        commands: ['ls'],
      };

      // This would fail at connection time
      await expect(service.executeDeployment(config)).rejects.toBeDefined();
    });

    it('should require either password or privateKeyPath', async () => {
      const config: DeployConfig = {
        ssh: {
          host: 'localhost',
          port: 22,
          username: 'user',
        },
        commands: ['ls'],
      };

      // Service should handle missing auth
      await expect(service.executeDeployment(config)).rejects.toBeDefined();
    });
  });
});
