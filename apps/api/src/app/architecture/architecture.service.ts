import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface LoadedArchitecture {
  source: string;
  receivedAt: string;
  payload: Record<string, unknown>;
}

type AnyRec = Record<string, unknown>;

/**
 * Merge an incoming architecture bundle into an accumulated snapshot.
 *
 * Mirrors what `libs/components/src/core/architecture-bridge.ts#mergeBundles`
 * does on the renderer, minus the visual X-shift — server-side merging is
 * just an append, since pushers (MCP) compute target positions themselves.
 *
 * - editor.layers: model dicts merged (Object.assign per layer.type).
 * - design.graph.blocks / wires: concatenated.
 * - dependencies: merged (incoming overwrites on key collision).
 * - package: kept from accumulated if present.
 */
function mergeArchitecture(accumulated: AnyRec | null, incoming: AnyRec): AnyRec {
  const inner = (incoming as { architecture?: AnyRec }).architecture ?? incoming;
  if (!accumulated) {
    return JSON.parse(JSON.stringify(inner));
  }

  const out = JSON.parse(JSON.stringify(accumulated)) as AnyRec;

  // Editor layers merge.
  const accEditor = (out.editor as AnyRec | undefined) ?? {};
  const accLayers = (accEditor.layers as AnyRec[] | undefined) ?? [];
  const inEditor = (inner.editor as AnyRec | undefined) ?? {};
  const inLayers = (inEditor.layers as AnyRec[] | undefined) ?? [];
  for (const inLayer of inLayers) {
    const layerType = inLayer.type as string | undefined;
    let target = accLayers.find((l) => l.type === layerType);
    if (!target) {
      target = { ...inLayer, models: { ...((inLayer.models as AnyRec) ?? {}) } };
      accLayers.push(target);
      continue;
    }
    const tgtModels = (target.models as AnyRec) ?? {};
    const inModels = (inLayer.models as AnyRec) ?? {};
    target.models = { ...tgtModels, ...inModels };
  }
  if (inLayers.length || !accEditor.layers) accEditor.layers = accLayers;
  out.editor = accEditor;

  // Design.graph blocks + wires concat.
  const accDesign = (out.design as AnyRec | undefined) ?? {};
  const accGraph = (accDesign.graph as AnyRec | undefined) ?? {};
  const inDesign = (inner.design as AnyRec | undefined) ?? {};
  const inGraph = (inDesign.graph as AnyRec | undefined) ?? {};
  const accBlocks = (accGraph.blocks as AnyRec[] | undefined) ?? [];
  const inBlocks = (inGraph.blocks as AnyRec[] | undefined) ?? [];
  const seenBlocks = new Set(accBlocks.map((b) => String(b.id)));
  for (const b of inBlocks) {
    if (!seenBlocks.has(String(b.id))) {
      accBlocks.push(b);
      seenBlocks.add(String(b.id));
    }
  }
  const accWires = (accGraph.wires as AnyRec[] | undefined) ?? [];
  const inWires = (inGraph.wires as AnyRec[] | undefined) ?? [];
  accDesign.graph = {
    blocks: accBlocks,
    wires: [...accWires, ...inWires],
    ...(accGraph.board || inGraph.board
      ? { board: accGraph.board ?? inGraph.board }
      : {}),
  };
  if (!accDesign.board && (inDesign.board || accDesign.board)) {
    accDesign.board = accDesign.board ?? inDesign.board;
  }
  out.design = accDesign;

  // Dependencies merge.
  out.dependencies = {
    ...((out.dependencies as AnyRec) ?? {}),
    ...((inner.dependencies as AnyRec) ?? {}),
  };

  // Package: keep accumulated; fall back to incoming.
  if (!out.package && inner.package) out.package = inner.package;

  return out;
}

/**
 * In-memory broker for architectures pushed in over HTTP (e.g. by the MCP
 * server). The gateway subscribes to the `loaded` event and rebroadcasts to
 * any connected renderer; the latest one is also kept around so a renderer
 * that connects late can request it via GET.
 *
 * Beyond the per-push `latest`, the service also keeps an `accumulated`
 * snapshot — every push is merged into it so callers (notably the MCP
 * `add_node` tool) can read the current canvas state instead of just the
 * delta in the last push.
 */
@Injectable()
export class ArchitectureService extends EventEmitter {
  private readonly logger = new Logger(ArchitectureService.name);
  private latest: LoadedArchitecture | null = null;
  private accumulated: Record<string, unknown> | null = null;
  private accumulatedAt: string | null = null;

  push(payload: Record<string, unknown>, source = 'unknown'): LoadedArchitecture {
    const record: LoadedArchitecture = {
      source,
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.latest = record;

    const inner =
      (payload as { architecture?: Record<string, unknown> }).architecture ?? payload;
    const mode = (inner as { mode?: string }).mode ?? 'append';
    if (mode === 'replace') {
      this.accumulated = JSON.parse(JSON.stringify(inner));
    } else {
      this.accumulated = mergeArchitecture(this.accumulated, inner);
    }
    this.accumulatedAt = record.receivedAt;

    this.logger.log(
      `Architecture received from "${source}" (deps=${Object.keys(
        (payload as { dependencies?: object }).dependencies || {},
      ).length}, mode=${mode})`,
    );
    this.emit('loaded', record);
    return record;
  }

  getLatest(): LoadedArchitecture | null {
    return this.latest;
  }

  getAccumulated(): {
    receivedAt: string | null;
    architecture: Record<string, unknown> | null;
  } {
    return {
      receivedAt: this.accumulatedAt,
      architecture: this.accumulated,
    };
  }

  /**
   * Replace the accumulator with the renderer's authoritative state.
   * Does NOT emit `loaded`, so the renderer isn't told to re-load itself.
   */
  seed(architecture: Record<string, unknown>): void {
    const inner =
      (architecture as { architecture?: Record<string, unknown> }).architecture ??
      architecture;
    this.accumulated = JSON.parse(JSON.stringify(inner));
    this.accumulatedAt = new Date().toISOString();
    this.logger.log(
      `Accumulator seeded from renderer (deps=${Object.keys(
        ((inner as { dependencies?: object }).dependencies) || {},
      ).length})`,
    );
  }

  clear(): void {
    this.latest = null;
    this.accumulated = null;
    this.accumulatedAt = null;
    this.emit('cleared');
  }
}
