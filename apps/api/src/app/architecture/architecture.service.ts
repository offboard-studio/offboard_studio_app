import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface LoadedArchitecture {
  source: string;
  receivedAt: string;
  payload: Record<string, unknown>;
}

/**
 * In-memory broker for architectures pushed in over HTTP (e.g. by the MCP
 * server). The gateway subscribes to the `loaded` event and rebroadcasts to
 * any connected renderer; the latest one is also kept around so a renderer
 * that connects late can request it via GET.
 */
@Injectable()
export class ArchitectureService extends EventEmitter {
  private readonly logger = new Logger(ArchitectureService.name);
  private latest: LoadedArchitecture | null = null;

  push(payload: Record<string, unknown>, source = 'unknown'): LoadedArchitecture {
    const record: LoadedArchitecture = {
      source,
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.latest = record;
    this.logger.log(
      `Architecture received from "${source}" (deps=${Object.keys(
        (payload as { dependencies?: object }).dependencies || {},
      ).length})`,
    );
    this.emit('loaded', record);
    return record;
  }

  getLatest(): LoadedArchitecture | null {
    return this.latest;
  }

  clear(): void {
    this.latest = null;
    this.emit('cleared');
  }
}
