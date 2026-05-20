# Overview

Offboard Studio is an Electron desktop app that hosts a drag-and-drop visual
editor for ROS robotics pipelines. The big picture has three cooperating
processes plus an out-of-repo Python sidecar.

```
┌─────────────────────────────────────── Electron main ───────────────────────────────────────┐
│                                                                                              │
│   ┌──────────────────┐    direct calls    ┌─────────────────────────────────────────────┐    │
│   │  ServerManager   │ ─────────────────▶ │  NestJS API (apps/api, in-process!)          │    │
│   │  (apps/electron) │  (no HTTP for IPC) │  - port 3333, prefix /api, Swagger /docs     │    │
│   │                  │                    │  - AppModule, DeploymentModule,              │    │
│   │  WindowManager   │                    │    ArchitectureModule, AppController2        │    │
│   │  IPCManager      │                    └─────────────────────────────────────────────┘    │
│   │  AppUpdater      │                                                                       │
│   │                  │   spawn child     ┌──────────────────────────────────────────────┐    │
│   │                  │ ─────────────────▶│  Python Django sidecar (board_api/, outside  │    │
│   │                  │                   │  repo). Resolved at runtime from              │    │
│   │                  │                   │  process.resourcesPath / ../../board_api/api  │    │
│   │                  │                   │  - port 5000, /api/healthcheck                │    │
│   └──────────────────┘                   └──────────────────────────────────────────────┘    │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ HTTP (dev) / IPC bridges (prod)
                                          ▼
┌──────────────────────────── Vite-served renderer (apps/renderer) ────────────────────────────┐
│  - React 18, createHashRouter (NOT BrowserRouter — packaged Electron loads via file://)       │
│  - Providers: ErrorBoundary → QueryClient → MUI Theme → Notifications → Firebase Auth         │
│  - Editor lives at libs/components/src/core/editor.ts (singleton)                             │
│  - architecture-bridge.ts polls /api/architecture/latest + /deletions                         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

A separate **MCP server** (`mcp/src/offboard_mcp`) runs out-of-process and
talks to the NestJS API over HTTP. It is not part of Electron — it's
launched by Claude Code / Cursor / any MCP-capable client via `mcp/run.sh`.

## Library boundaries (`tsconfig.base.json` paths)

| Alias | Purpose |
|---|---|
| `@api` | NestJS server. `ServerController` is what electron imports. |
| `@ai-modules` | Standalone NestJS sub-module merged into main API. |
| `@components` | Shared React UI: board, canvas, dialogs, auth, notifications. |
| `@pages` | Page-level routed components. |
| `@diagrams` | react-diagrams drag-and-drop core integration. |
| `@assets/*` | Static assets. |

Module boundary enforced by `@nx/enforce-module-boundaries`. Cross-lib
imports MUST use these aliases — relative paths across project boundaries
are an ESLint error.

## Common commands

All at repo root:

- `npm run dev` — renderer + electron in parallel
- `npm run build:app` — clean + Vite renderer + webpack electron
- `npm run package:electron-app:{mac,linux,win}` — electron-builder installer
- `npm run test:unit` — Jest across `renderer api components pages` (excludes electron / e2e / diagrams / ai-modules deliberately)
- `npm run test:e2e` — Playwright against the **built** electron app
- `npm run lint:all` — `api electron renderer components pages`

## Things that bite

- The NestJS API is **in-process** with Electron main. `ServerController`
  is instantiated via `require('@api')` inside `ServerManager.createServer()`.
  Touching the API module graph affects Electron startup.
- `apps/electron/src/core/electron_app.ts` polls `127.0.0.1:$PORT` for up
  to 10s waiting for the renderer dev server before creating the
  BrowserWindow. If you change the renderer port, change `PORT` in `.env`,
  not the polling logic.
- `createHashRouter` is mandatory in `apps/renderer/src/app/App.tsx`.
  BrowserRouter breaks file:// loading in packaged Electron.
- The `python_deneme/` directory is experimental scratch and **not** the
  runtime Django sidecar — `board_api/` is, and it lives outside this repo.
- `npm run test:unit` skips electron / diagrams / ai-modules / e2e on
  purpose; adding tests there requires editing the script.

## Build pipeline specifics

- Renderer: `@nx/vite:build` → `release/build/renderer`. Prod uses
  `baseHref: "./"` (mandatory for Electron `file://`).
- Electron: TWO build targets. `build:dev` uses `nx-electron:build`;
  `build:prod` uses `@nx/webpack:webpack` with the custom config at
  `.config/webpack/webpack.config.main.prod.js` and a large `external` list
  (gRPC, kafkajs, mqtt, nats, ioredis, amqplib, the unused
  `@nestjs/microservices`/`websockets`/`swagger`/`mapped-types`) — these
  must remain external because they are optional NestJS transports that
  should not be bundled.
- `electron-builder` config lives in `package.json#build`. Bundles
  `release/build`, `node_modules`, `.config/buildResources/**/*`, AND
  `board_api/` (the Django sidecar). The `afterSign` hook runs
  `.config/scripts/notarize.js` for macOS notarization.
