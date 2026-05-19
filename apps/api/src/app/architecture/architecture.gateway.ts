import { Logger, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { ArchitectureService } from './architecture.service';

/**
 * WebSocket bridge between the HTTP push surface and any connected renderer.
 *
 * Events:
 *   server → client: "architecture:load"   payload = LoadedArchitecture
 *   client → server: "architecture:request-latest" → server replies with
 *                    "architecture:load" if anything is cached.
 */
@WebSocketGateway({
  namespace: '/architecture',
  cors: { origin: '*', credentials: false },
})
export class ArchitectureGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ArchitectureGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly architectureService: ArchitectureService) {}

  onModuleInit(): void {
    this.architectureService.on('loaded', (record) => {
      if (!this.server) return;
      this.server.emit('architecture:load', record);
    });
    this.architectureService.on('cleared', () => {
      if (!this.server) return;
      this.server.emit('architecture:cleared', {});
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`renderer connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`renderer disconnected: ${client.id}`);
  }

  @SubscribeMessage('architecture:request-latest')
  onRequestLatest(client: Socket): void {
    const latest = this.architectureService.getLatest();
    if (latest) {
      client.emit('architecture:load', latest);
    }
  }
}
