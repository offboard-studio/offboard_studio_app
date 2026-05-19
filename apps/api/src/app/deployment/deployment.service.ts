
import { Injectable, Logger } from '@nestjs/common';
import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
}

export interface DeployConfig {
  ssh: SshConfig;
  commands: string[];
  files?: { path: string; content: string }[];
}

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  async executeDeployment(config: DeployConfig): Promise<string[]> {
    const logs: string[] = [];
    const client = new Client();

    return new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.ssh.username,
      };

      if (config.ssh.privateKeyPath) {
        try {
          connectConfig.privateKey = fs.readFileSync(config.ssh.privateKeyPath);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          reject(`Failed to read private key: ${msg}`);
          return;
        }
      } else {
        connectConfig.password = config.ssh.password;
      }

      client
        .on('ready', () => {
          this.logger.log('SSH Connection ready');
          logs.push('SSH Connection established.');

          this.runCommands(client, config.commands, logs)
            .then(() => {
              client.end();
              resolve(logs);
            })
            .catch((err) => {
              client.end();
              reject(err);
            });
        })
        .on('error', (err) => {
          this.logger.error('SSH Connection Error', err);
          reject(err);
        })
        .connect(connectConfig);
    });
  }

  private async runCommands(client: Client, commands: string[], logs: string[]): Promise<void> {
    for (const cmd of commands) {
      logs.push(`> ${cmd}`);
      await new Promise<void>((resolve, reject) => {
        client.exec(cmd, (err, stream) => {
            if (err) {
                reject(err);
                return;
            }
            stream.on('close', (code: any, signal: any) => {
              logs.push(`Command exited with code ${code}`);
              if (code !== 0) {
                  // Depending on requirement, we might want to stop or continue
                  // For now, let's continue but log error
                  this.logger.warn(`Command failed: ${cmd}`);
              }
              resolve();
            }).on('data', (data: any) => {
              const output = data.toString().trim();
              if (output) logs.push(output);
            }).stderr.on('data', (data: any) => {
              const error = data.toString().trim();
              if (error) logs.push(`ERR: ${error}`);
            });
        });
      });
    }
  }
}
