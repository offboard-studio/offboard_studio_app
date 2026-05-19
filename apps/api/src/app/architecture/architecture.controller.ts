import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ArchitectureService } from './architecture.service';

interface LoadBody {
  architecture: Record<string, unknown>;
  source?: string;
}

interface SyncBody {
  architecture: Record<string, unknown>;
}

interface RemoveBody {
  node_ids: string[];
}

@ApiTags('architecture')
@Controller('architecture')
export class ArchitectureController {
  constructor(private readonly architectureService: ArchitectureService) {}

  @Post('load')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Push an architecture bundle into the running app. The renderer is notified over WebSocket.',
  })
  load(@Body() body: LoadBody) {
    if (!body?.architecture || typeof body.architecture !== 'object') {
      return { ok: false, error: 'body.architecture is required' };
    }
    const record = this.architectureService.push(
      body.architecture,
      body.source || 'http',
    );
    return {
      ok: true,
      source: record.source,
      receivedAt: record.receivedAt,
    };
  }

  @Get('latest')
  @ApiOperation({ summary: 'Return the most recently pushed architecture, if any.' })
  latest() {
    return this.architectureService.getLatest() ?? { latest: null };
  }

  @Get('state')
  @ApiOperation({
    summary:
      'Return the accumulated architecture snapshot — every push merged into one bundle. ' +
      'Use this (not /latest) to read the live canvas state from outside the renderer.',
  })
  state() {
    return this.architectureService.getAccumulated();
  }

  @Post('sync')
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Seed/replace the accumulator with the renderer's current editor state. " +
      "Called by the renderer when its canvas drifts from the server's accumulated view " +
      '(e.g. on boot after an API restart, or after a manual File → Open).',
  })
  sync(@Body() body: SyncBody) {
    if (!body?.architecture || typeof body.architecture !== 'object') {
      return { ok: false, error: 'body.architecture is required' };
    }
    this.architectureService.seed(body.architecture);
    return;
  }

  @Post('remove-nodes')
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Surgically remove nodes from the canvas. Updates the accumulator, ' +
      'drops any link touching the removed nodes, GCs unused dependencies, ' +
      'and notifies subscribers (renderer bridge) so they can apply the same ' +
      'removal locally without a full canvas reload.',
  })
  removeNodes(@Body() body: RemoveBody) {
    if (!Array.isArray(body?.node_ids) || body.node_ids.length === 0) {
      return { ok: false, error: 'node_ids[] is required' };
    }
    const { receivedAt } = this.architectureService.remove(
      body.node_ids.map(String),
    );
    return { ok: true, receivedAt, removed_count: body.node_ids.length };
  }

  @Get('deletions')
  @ApiOperation({
    summary:
      'Deletion log since the given timestamp. The bridge polls this on the ' +
      'same cadence as /latest and applies new deletions via editor.removeNode.',
  })
  deletions(@Query('since') since?: string) {
    return this.architectureService.getDeletionsSince(since ?? null);
  }

  @Delete('latest')
  @HttpCode(204)
  clear() {
    this.architectureService.clear();
  }
}
