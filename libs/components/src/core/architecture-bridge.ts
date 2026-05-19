/**
 * Listens to the NestJS API's `/architecture` Socket.IO namespace and loads
 * any architecture pushed there into the running Editor.
 *
 * The MCP server (or any other tool) only has to POST to
 * `/api/architecture/load`; this module makes the result appear in the
 * renderer without the user clicking anything.
 */

import { io, Socket } from 'socket.io-client';

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

let socket: Socket | null = null;
let onLoaded: ((message: LoadedArchitecture) => void) | null = null;

function resolveApiUrl(): string {
    return (
        import.meta.env.VITE_NODE_API_URL ||
        (import.meta.env.VITE_NODE_API_PORT
            ? `http://localhost:${import.meta.env.VITE_NODE_API_PORT}`
            : DEFAULT_API_URL)
    );
}

function applyToEditor(message: LoadedArchitecture): void {
    const bundle = message.payload?.architecture ?? message.payload;
    if (!bundle || typeof bundle !== 'object') {
        return;
    }
    const editor = Editor.getInstance();
    try {
        editor.loadProject(
            {
                editor: (bundle as { editor: unknown }).editor,
                design: (bundle as { design: unknown }).design,
                dependencies:
                    ((bundle as { dependencies?: Record<string, unknown> })
                        .dependencies as never) ?? {},
                package: ((bundle as { package?: unknown }).package as never) ?? ({
                    name: `MCP push (${message.source})`,
                    version: '0.0.1',
                    description: `Pushed at ${message.receivedAt}`,
                    author: '',
                    image: '',
                } as never),
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

export function startArchitectureBridge(
    apiUrl: string = resolveApiUrl(),
    onLoadedCallback?: (message: LoadedArchitecture) => void,
): () => void {
    if (socket) {
        return stopArchitectureBridge;
    }
    onLoaded = onLoadedCallback ?? null;
    const url = apiUrl.replace(/\/$/, '');
    socket = io(`${url}/architecture`, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        autoConnect: true,
    });

    socket.on('connect', () => {
        socket?.emit('architecture:request-latest');
    });

    socket.on('architecture:load', (message: LoadedArchitecture) => {
        applyToEditor(message);
        onLoaded?.(message);
    });

    socket.on('connect_error', (err) => {
        // Don't toast — backend may simply be off during dev. Log only.
        // eslint-disable-next-line no-console
        console.warn('[architecture-bridge] connect_error:', err.message);
    });

    return stopArchitectureBridge;
}

export function stopArchitectureBridge(): void {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    onLoaded = null;
}

export function isArchitectureBridgeConnected(): boolean {
    return socket?.connected ?? false;
}
