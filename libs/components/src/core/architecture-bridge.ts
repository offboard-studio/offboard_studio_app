/**
 * Polls the NestJS API for architectures pushed in over `/api/architecture/load`
 * and loads any new bundle into the running Editor singleton.
 *
 * This is intentionally polling-based (not WebSocket) so the renderer has
 * zero extra dependencies — the MCP server only needs `http://localhost:3333`
 * reachable. Default cadence is 2s, which is plenty for an editor-side push.
 */

import Editor from './editor';
import { reportError } from './errors/errorReporter';
import { AppError, ErrorCode } from './errors/AppError';

interface LoadedArchitecture {
    source: string;
    receivedAt: string;
    payload: {
        editor?: unknown;
        design?: unknown;
        dependencies?: Record<string, unknown>;
        package?: unknown;
        architecture?: {
            editor?: unknown;
            design?: unknown;
            dependencies?: Record<string, unknown>;
            package?: unknown;
        };
    };
}

const DEFAULT_API_URL = 'http://localhost:3333';
const DEFAULT_POLL_MS = 2000;

let timer: ReturnType<typeof setInterval> | null = null;
let lastReceivedAt: string | null = null;
let onLoaded: ((message: LoadedArchitecture) => void) | null = null;

function resolveApiUrl(): string {
    const url =
        import.meta.env.VITE_NODE_API_URL ||
        (import.meta.env.VITE_NODE_API_PORT
            ? `http://localhost:${import.meta.env.VITE_NODE_API_PORT}`
            : DEFAULT_API_URL);
    return url.replace(/\/$/, '');
}

/**
 * Some pushers (notably older MCP server builds) emit node/port/link `type`
 * fields that don't match the factories the renderer registers — e.g.
 * `basic.code.<hash>` for nodes (the hash is really the dependency id),
 * `diagram-default` for links/ports. react-diagrams aborts the whole
 * deserialise on the first unknown type, so we normalise here before
 * handing the bundle to the Editor.
 */
function normaliseBundle(bundle: Record<string, unknown>): void {
    const editor = bundle.editor as { layers?: Array<Record<string, unknown>> } | undefined;
    const layers = editor?.layers;
    const dependencies =
        (bundle.dependencies as Record<string, Record<string, unknown>> | undefined) ?? {};
    if (Array.isArray(layers)) {
        for (const layer of layers) {
            const models = layer?.models as Record<string, Record<string, unknown>> | undefined;
            if (!models) continue;
            if (layer.type === 'diagram-nodes') {
                for (const node of Object.values(models)) {
                    const t = node.type;
                    let depId: string | undefined;
                    if (typeof t === 'string' && t.startsWith('basic.code.')) {
                        const extras = (node.extras ??= {}) as Record<string, unknown>;
                        if (extras.dependency_id == null) extras.dependency_id = t;
                        depId = t;
                        node.type = 'basic.code';
                    } else {
                        const extras = node.extras as Record<string, unknown> | undefined;
                        if (extras && typeof extras.dependency_id === 'string') {
                            depId = extras.dependency_id;
                        }
                    }
                    const ports = node.ports as Array<Record<string, unknown>> | undefined;
                    if (Array.isArray(ports)) {
                        for (const p of ports) {
                            if (p.type === 'diagram-default' || typeof p.type !== 'string') {
                                p.type = p.in ? 'port.input' : 'port.output';
                            }
                        }
                    }
                    const dep = depId ? dependencies[depId] : undefined;
                    const data = (node.data && typeof node.data === 'object'
                        ? (node.data as Record<string, unknown>)
                        : null) ?? {};
                    if (dep) {
                        if (typeof data.code !== 'string' || data.code === '') {
                            if (typeof dep.code === 'string') data.code = dep.code;
                        }
                        if (data.aiDescription == null && typeof dep.description === 'string') {
                            data.aiDescription = dep.description;
                        }
                        if (!Array.isArray(data.params) && Array.isArray(dep.parameters)) {
                            data.params = (dep.parameters as unknown[]).map((p) =>
                                typeof p === 'string' ? { name: p } : p,
                            );
                        }
                    }
                    const portsIn = (Array.isArray(ports) ? ports : []).filter((p) => p.in);
                    const portsOut = (Array.isArray(ports) ? ports : []).filter((p) => !p.in);
                    data.code ??= '';
                    data.aiDescription ??= '';
                    data.frequency ??= '1';
                    data.params ??= [];
                    if (!data.ports || typeof data.ports !== 'object') {
                        data.ports = {
                            in: portsIn.map((p) => ({ name: String(p.name ?? p.label ?? '') })),
                            out: portsOut.map((p) => ({ name: String(p.name ?? p.label ?? '') })),
                        };
                    }
                    node.data = data;
                }
            } else if (layer.type === 'diagram-links') {
                const nodeLayer = layers.find((l) => l.type === 'diagram-nodes');
                const nodeIndex = new Map<string, { x: number; y: number }>();
                const nodeModels = nodeLayer?.models as Record<string, Record<string, unknown>> | undefined;
                if (nodeModels) {
                    for (const [, n] of Object.entries(nodeModels)) {
                        nodeIndex.set(String(n.id), {
                            x: Number(n.x) || 0,
                            y: Number(n.y) || 0,
                        });
                    }
                }
                for (const link of Object.values(models)) {
                    if (link.type === 'diagram-default' || typeof link.type !== 'string') {
                        link.type = 'default';
                    }
                    let pts = link.points as Array<Record<string, unknown>> | undefined;
                    if (!Array.isArray(pts) || pts.length < 2) {
                        const src = nodeIndex.get(String(link.source)) ?? { x: 0, y: 0 };
                        const tgt = nodeIndex.get(String(link.target)) ?? { x: 0, y: 0 };
                        pts = [
                            { id: cryptoRandomId(), type: 'point', x: src.x, y: src.y, selected: false },
                            { id: cryptoRandomId(), type: 'point', x: tgt.x, y: tgt.y, selected: false },
                        ];
                        link.points = pts;
                    }
                    link.labels ??= [];
                }
            }
        }
    }
}

function cryptoRandomId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `pt_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

type AnyRec = Record<string, unknown>;

function getLayer(bundle: AnyRec | undefined, layerType: string): AnyRec | undefined {
    const editor = bundle?.editor as { layers?: AnyRec[] } | undefined;
    return editor?.layers?.find((l) => l.type === layerType);
}

function getModels(bundle: AnyRec | undefined, layerType: string): Record<string, AnyRec> {
    const layer = getLayer(bundle, layerType);
    return (layer?.models as Record<string, AnyRec>) ?? {};
}

/**
 * Merge `incoming` into `current` so successive pushes append nodes/links
 * instead of wiping the canvas. Incoming nodes are shifted to the right of
 * the existing graph so they don't overlap, and the link points are shifted
 * by the same amount to keep the wires visually attached.
 */
function mergeBundles(
    current: AnyRec,
    incoming: AnyRec,
    message: LoadedArchitecture,
): {
    editor: unknown;
    design: unknown;
    dependencies: Record<string, unknown>;
    package: unknown;
} {
    const existingNodes = Object.values(getModels(current, 'diagram-nodes'));
    const incomingNodes = Object.values(getModels(incoming, 'diagram-nodes'));

    let dx = 0;
    if (existingNodes.length && incomingNodes.length) {
        const existingMaxX = Math.max(...existingNodes.map((n) => Number(n.x) || 0));
        const incomingMinX = Math.min(...incomingNodes.map((n) => Number(n.x) || 0));
        dx = existingMaxX + 320 - incomingMinX;
        if (dx < 0) dx = 0;
    }

    const mergedEditor: AnyRec = JSON.parse(JSON.stringify(current.editor ?? {}));
    if (!Array.isArray(mergedEditor.layers)) mergedEditor.layers = [];
    const layers = mergedEditor.layers as AnyRec[];
    const incomingLayers = (incoming.editor as { layers?: AnyRec[] })?.layers ?? [];

    for (const incomingLayer of incomingLayers) {
        const targetLayer =
            layers.find((l) => l.type === incomingLayer.type) ??
            (() => {
                const fresh: AnyRec = { type: incomingLayer.type, models: {} };
                layers.push(fresh);
                return fresh;
            })();
        const targetModels = (targetLayer.models as Record<string, AnyRec>) ?? {};
        const incomingModels = (incomingLayer.models as Record<string, AnyRec>) ?? {};
        if (incomingLayer.type === 'diagram-nodes' && dx !== 0) {
            for (const n of Object.values(incomingModels)) {
                n.x = (Number(n.x) || 0) + dx;
            }
        }
        if (incomingLayer.type === 'diagram-links' && dx !== 0) {
            for (const link of Object.values(incomingModels)) {
                const pts = link.points as AnyRec[] | undefined;
                if (Array.isArray(pts)) {
                    for (const p of pts) p.x = (Number(p.x) || 0) + dx;
                }
            }
        }
        Object.assign(targetModels, incomingModels);
        targetLayer.models = targetModels;
    }

    const currentDesign = (current.design as AnyRec) ?? {};
    const currentGraph = (currentDesign.graph as AnyRec) ?? {};
    const incomingDesign = (incoming.design as AnyRec) ?? {};
    const incomingGraph = (incomingDesign.graph as AnyRec) ?? {};
    const incomingBlocks = (incomingGraph.blocks as AnyRec[]) ?? [];
    if (dx !== 0) {
        for (const b of incomingBlocks) {
            const pos = b.position as AnyRec | undefined;
            if (pos) pos.x = (Number(pos.x) || 0) + dx;
        }
    }
    const mergedDesign: AnyRec = {
        board: currentDesign.board ?? incomingDesign.board ?? 'Python3-Noetic',
        graph: {
            blocks: [...((currentGraph.blocks as AnyRec[]) ?? []), ...incomingBlocks],
            wires: [
                ...((currentGraph.wires as AnyRec[]) ?? []),
                ...((incomingGraph.wires as AnyRec[]) ?? []),
            ],
        },
    };

    const mergedDeps: Record<string, unknown> = {
        ...((current.dependencies as Record<string, unknown>) ?? {}),
        ...((incoming.dependencies as Record<string, unknown>) ?? {}),
    };

    const pkg =
        (current.package as AnyRec) ??
        (incoming.package as AnyRec) ?? {
            name: `MCP push (${message.source})`,
            version: '0.0.1',
            description: `Pushed at ${message.receivedAt}`,
            author: '',
            image: '',
        };

    return {
        editor: mergedEditor,
        design: mergedDesign,
        dependencies: mergedDeps,
        package: pkg,
    };
}

function applyToEditor(message: LoadedArchitecture): void {
    const bundle = message.payload?.architecture ?? message.payload;
    if (!bundle || typeof bundle !== 'object') {
        return;
    }
    normaliseBundle(bundle as AnyRec);

    // Honour an opt-out: payload may carry `mode: 'replace'` to wipe the canvas.
    // Default behaviour is append — successive pushes add to the existing graph
    // instead of replacing it.
    const mode = (bundle as { mode?: string }).mode ?? 'append';
    const editor = Editor.getInstance();
    try {
        if (mode === 'replace') {
            editor.loadProject(
                {
                    editor: (bundle as { editor: unknown }).editor,
                    design: (bundle as { design: unknown }).design,
                    dependencies:
                        ((bundle as { dependencies?: Record<string, unknown> })
                            .dependencies as never) ?? {},
                    package:
                        ((bundle as { package?: unknown }).package as never) ??
                        ({
                            name: `MCP push (${message.source})`,
                            version: '0.0.1',
                            description: `Pushed at ${message.receivedAt}`,
                            author: '',
                            image: '',
                        } as never),
                },
                `mcp_push_${Date.now()}`,
            );
            return;
        }

        const current = editor.serialise() as AnyRec;
        const merged = mergeBundles(current, bundle as AnyRec, message);
        editor.loadProject(
            {
                editor: merged.editor as never,
                design: merged.design as never,
                dependencies: merged.dependencies as never,
                package: merged.package as never,
            },
            `mcp_push_${Date.now()}`,
        );
    } catch (err) {
        reportError(
            new AppError({
                code: ErrorCode.UNKNOWN_ERROR,
                message: 'Pushed architecture could not be loaded.',
                originalError: err,
            }),
        );
    }
}

async function pollOnce(apiUrl: string): Promise<void> {
    try {
        const resp = await fetch(`${apiUrl}/api/architecture/latest`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return;
        const body = (await resp.json()) as LoadedArchitecture | { latest: null };
        if (!('receivedAt' in body) || !body.receivedAt) return;
        if (body.receivedAt === lastReceivedAt) return;
        lastReceivedAt = body.receivedAt;
        applyToEditor(body);
        onLoaded?.(body);
    } catch {
        // Backend probably off — silent. Don't spam the console.
    }
}

/**
 * Push the renderer's current editor state to /api/architecture/sync so the
 * server-side accumulator (used by MCP tools like `add_node`) reflects what
 * the user actually sees. Called when our local canvas has nodes but the
 * server's accumulator is empty — i.e. after an API restart.
 */
async function syncIfDrifted(apiUrl: string): Promise<void> {
    try {
        const stateResp = await fetch(`${apiUrl}/api/architecture/state`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        if (!stateResp.ok) return;
        const state = (await stateResp.json()) as {
            architecture: AnyRec | null;
        };

        const serverNodeCount = countNodes(state?.architecture ?? null);
        const local = Editor.getInstance().serialise() as AnyRec;
        const localNodeCount = countNodes(local);

        // Only seed when the server is empty (or wildly out of sync). Don't
        // overwrite a populated accumulator — the server's view may be ahead
        // (e.g. another client just pushed).
        if (localNodeCount > 0 && serverNodeCount < localNodeCount) {
            await fetch(`${apiUrl}/api/architecture/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ architecture: local }),
            });
        }
    } catch {
        // API offline — nothing to seed against.
    }
}

function countNodes(arch: AnyRec | null): number {
    if (!arch) return 0;
    const editor = arch.editor as { layers?: AnyRec[] } | undefined;
    const layer = editor?.layers?.find((l) => l.type === 'diagram-nodes');
    const models = (layer?.models as AnyRec | undefined) ?? {};
    return Object.keys(models).length;
}

export function startArchitectureBridge(
    apiUrl: string = resolveApiUrl(),
    onLoadedCallback?: (message: LoadedArchitecture) => void,
    pollIntervalMs: number = DEFAULT_POLL_MS,
): () => void {
    if (timer) {
        return stopArchitectureBridge;
    }
    onLoaded = onLoadedCallback ?? null;
    const url = apiUrl.replace(/\/$/, '');
    // Prime once so a freshly-opened renderer picks up an already-pushed graph.
    void pollOnce(url);
    // After a delay (let any project file finish loading first) push our
    // current canvas to the server-side accumulator if it's behind us.
    setTimeout(() => void syncIfDrifted(url), 2500);
    timer = setInterval(() => void pollOnce(url), pollIntervalMs);
    return stopArchitectureBridge;
}

export function stopArchitectureBridge(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    onLoaded = null;
    lastReceivedAt = null;
}

export function isArchitectureBridgeActive(): boolean {
    return timer !== null;
}
