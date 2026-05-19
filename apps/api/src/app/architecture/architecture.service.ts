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

  // Design.graph blocks: ID-aware merge so a re-pushed block with the same
  // id OVERWRITES the accumulated copy (used by `update_node`). Plain concat
  // would leave the stale copy in front and silently ignore the new one.
  const accDesign = (out.design as AnyRec | undefined) ?? {};
  const accGraph = (accDesign.graph as AnyRec | undefined) ?? {};
  const inDesign = (inner.design as AnyRec | undefined) ?? {};
  const inGraph = (inDesign.graph as AnyRec | undefined) ?? {};
  const accBlocks = (accGraph.blocks as AnyRec[] | undefined) ?? [];
  const inBlocks = (inGraph.blocks as AnyRec[] | undefined) ?? [];
  const blockOrder: string[] = [];
  const blockMap = new Map<string, AnyRec>();
  for (const b of accBlocks) {
    const id = String(b.id);
    if (!blockMap.has(id)) blockOrder.push(id);
    blockMap.set(id, b);
  }
  for (const b of inBlocks) {
    const id = String(b.id);
    if (!blockMap.has(id)) blockOrder.push(id);
    blockMap.set(id, b);
  }
  const mergedBlocks = blockOrder.map((id) => blockMap.get(id) as AnyRec);
  const accWires = (accGraph.wires as AnyRec[] | undefined) ?? [];
  const inWires = (inGraph.wires as AnyRec[] | undefined) ?? [];
  accDesign.graph = {
    blocks: mergedBlocks,
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

  // Package: explicit overwrite when incoming carries one (e.g.
  // update_project_settings pushes a `package: {...}`-only patch). The old
  // "first-set wins" behaviour silently dropped settings updates.
  if (inner.package) out.package = inner.package;

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
  private deletions: Array<{ ids: string[]; at: string }> = [];

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
   * Surgically remove nodes from the accumulator. Returns the receivedAt
   * marker callers can use to track applied deletions. Drops every link/wire
   * that touched a removed node, and garbage-collects unreferenced deps.
   *
   * Emits `removed` so subscribers (the bridge over HTTP polling or the
   * gateway over WebSocket) can apply the same surgical removal locally
   * instead of forcing a full canvas reload.
   */
  remove(nodeIds: string[]): { receivedAt: string } {
    const at = new Date().toISOString();
    const idSet = new Set(nodeIds.map(String));
    if (this.accumulated) {
      const acc = this.accumulated as AnyRec;
      const editor = (acc.editor as AnyRec | undefined) ?? {};
      const layers = (editor.layers as AnyRec[] | undefined) ?? [];

      const nodesLayer = layers.find((l) => l.type === 'diagram-nodes');
      if (nodesLayer) {
        const models = (nodesLayer.models as Record<string, AnyRec>) ?? {};
        for (const id of idSet) delete models[id];
        nodesLayer.models = models;
      }
      const linksLayer = layers.find((l) => l.type === 'diagram-links');
      if (linksLayer) {
        const linkModels = (linksLayer.models as Record<string, AnyRec>) ?? {};
        for (const [lid, link] of Object.entries(linkModels)) {
          if (
            idSet.has(String(link.source)) ||
            idSet.has(String(link.target))
          ) {
            delete linkModels[lid];
          }
        }
        linksLayer.models = linkModels;
      }

      const design = (acc.design as AnyRec | undefined) ?? {};
      const graph = (design.graph as AnyRec | undefined) ?? {};
      graph.blocks = ((graph.blocks as AnyRec[] | undefined) ?? []).filter(
        (b) => !idSet.has(String(b.id)),
      );
      graph.wires = ((graph.wires as AnyRec[] | undefined) ?? []).filter(
        (w) =>
          !idSet.has(String((w.source as AnyRec | undefined)?.block)) &&
          !idSet.has(String((w.target as AnyRec | undefined)?.block)),
      );
      design.graph = graph;
      acc.design = design;

      // GC unreferenced deps.
      const remainingNodes = Object.values(
        (nodesLayer?.models as Record<string, AnyRec> | undefined) ?? {},
      );
      const usedDepIds = new Set<string>();
      for (const n of remainingNodes) {
        const dep =
          (n.extras as AnyRec | undefined)?.dependency_id ?? n.type;
        if (typeof dep === 'string') usedDepIds.add(dep);
      }
      const deps = (acc.dependencies as AnyRec | undefined) ?? {};
      for (const d of Object.keys(deps)) {
        if (!usedDepIds.has(d)) delete deps[d];
      }
      acc.dependencies = deps;

      this.accumulated = acc;
      this.accumulatedAt = at;
    }

    this.deletions.push({ ids: [...idSet], at });
    if (this.deletions.length > 200) {
      this.deletions = this.deletions.slice(-200);
    }
    this.logger.log(`Removed ${idSet.size} node(s) — ${[...idSet].join(', ')}`);
    this.emit('removed', { ids: [...idSet], at });
    return { receivedAt: at };
  }

  /** Deletions newer than `since` (ISO timestamp). Pass `null` to get all. */
  getDeletionsSince(since: string | null): {
    latestAt: string | null;
    deletions: Array<{ ids: string[]; at: string }>;
  } {
    const latestAt = this.deletions.length
      ? this.deletions[this.deletions.length - 1].at
      : null;
    if (!since) {
      return { latestAt, deletions: [...this.deletions] };
    }
    return {
      latestAt,
      deletions: this.deletions.filter((d) => d.at > since),
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
    this.deletions = [];
    this.emit('cleared');
  }
}
