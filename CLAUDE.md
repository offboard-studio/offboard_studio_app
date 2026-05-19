# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI-based drag-and-drop **Offboard Studio for Robotics**, shipped as an Electron desktop app. It is an Nx monorepo (Nx 17.1.3, npm 8.19.2, Node ≥ 18) composed of multiple cooperating processes: an Electron shell that spawns a NestJS API in-process and a Django Python sidecar, with a React (Vite) renderer.

## Common commands

All commands are npm scripts at the repo root unless noted.

- `npm run dev` — runs renderer + electron in parallel (`nx run-many -t serve -p renderer electron`). This is the only supported dev entry point.
- `npm run build:app` — full production build: cleans `release/`, builds renderer (Vite), then builds electron (webpack prod). Required before any `package:*`.
- `npm run package:electron-app:mac|linux|win` — produces installer using `electron-builder`. Requires a prior `build:app`.
- `npm run test:unit` — Jest unit tests across `renderer api components pages` only. Other projects (electron, e2e, libs/diagrams, libs/ai-modules) are deliberately excluded.
- `npm run test:e2e` — Playwright tests against the **built** electron app. Must run `build:app` first and copy `.env.e2e.example` → `.env.e2e`.
- `npm run lint:all` — lints `api electron renderer components pages`. Per-project: `lint:api`, `lint:electron`, `lint:renderer`, `lint:components`, `lint:pages`.
- `npm run commit` — Commitizen CLI prompt; commits go through commitlint (conventional commits).

### Running a single test / project

- Single Nx project test: `npx nx test <project>` (e.g. `npx nx test components`).
- Single file (Jest): `npx nx test renderer --testFile=path/to/file.spec.tsx` or `npx jest <pattern>` from the project root.
- Single Nx project lint: `npx nx lint <project>`.
- Affected-only: `npx nx affected -t lint test build`.

## Architecture

### Three-process model

1. **Electron main** (`apps/electron`) — entry `apps/electron/src/main.ts` → `ElectronApp` (`apps/electron/src/core/electron_app.ts`). Composed of four managers in `apps/electron/src/core/`:
   - `ServerManager` — instantiates the NestJS API **in-process** (not as a child process) via `new ServerController()` imported from `@api`, and spawns the Python Django sidecar as a child process. Exposes direct method calls (no HTTP) to electron-main like `processFileViaIPC`, `aiBuildSync`, `saveFileViaIPC`, `validateFileViaIPC`.
   - `WindowManager` — BrowserWindow lifecycle, loads renderer via `resolveHtmlPath('index.html')` (dev: `http://127.0.0.1:$PORT`, prod: bundled file).
   - `IPCManager` — `ipcMain.handle` bridges (download-file, ai-build-sync, etc.) that delegate to `ServerManager` and `WindowManager`.
   - `AppUpdater` — electron-updater bootstrap.
2. **NestJS API** (`apps/api`) — `ServerController` in `apps/api/src/index.ts` boots `AppModule` on port 3333 with global prefix `/api`, Swagger at `/docs`. Modules: `AppModule` (root, also imports `AppController2` from `@ai-modules`), `DeploymentModule` (SSH deployment), plus `AppIPCService` / `AppSingleton` injected into electron-main via `ServerController.getAppIPCService()` for direct cross-process calls without HTTP.
3. **React renderer** (`apps/renderer`) — Vite app on port 3001. Entry `main.tsx` mounts `App.tsx`, which uses `createHashRouter` (intentional: avoids `basename`/`file://` issues in packaged Electron). Routing surface is in `libs/pages` (`SignIn`, `SignUp`, `DashboardPage`, `BoardPage`, `ProjectDetailPage`, `ProfilePage`). Providers wrapping the router: `ErrorBoundary` → `QueryClientProvider` (React Query) → MUI `ThemeProvider` → `NotificationProvider` → `AuthProvider` (Firebase).

A **Python Django sidecar** lives outside this repo at `board_api/` (resolved at runtime via `process.resourcesPath` when packaged, or `../../board_api/api` in dev). It is launched on demand with its own `venv`, and `ServerManager.waitForDjangoServer` polls `:5000/api/healthcheck`.

### Libraries (`libs/*`) and import aliases

TypeScript path aliases (see `tsconfig.base.json`) are how cross-project imports work — **do not use relative paths across project boundaries**:

| Alias | Source | Purpose |
|---|---|---|
| `@api` | `apps/api/src/*` | NestJS server. `ServerController` is imported by electron. |
| `@ai-modules` | `libs/ai-modules/src` | Standalone NestJS sub-module (`AppController2`, `AppService2`) merged into the main API. |
| `@components` | `libs/components/src` | Shared React UI: board, canvas, dialogs, minimap, error-boundary, auth (Firebase), notifications, theme, common. |
| `@pages` | `libs/pages/src` | Page-level routed components consumed by the renderer's router. |
| `@diagrams` | `libs/diagrams/src` | React-diagrams integration (drag-and-drop board core). |
| `@assets/*` | `libs/assets/src/assets/*` | Static assets. |

Cross-lib boundary rule is enforced by `@nx/enforce-module-boundaries` in `.eslintrc.json`.

### Build pipeline specifics

- Renderer is built with `@nx/vite:build` to `release/build/renderer` (production uses `baseHref: "./"` — required for Electron `file://` loading).
- Electron has **two** build targets in `apps/electron/project.json`: `build:dev` uses `nx-electron:build`, while `build:prod` (used by `npm run build:electron`) uses `@nx/webpack:webpack` with a custom config at `.config/webpack/webpack.config.main.prod.js` and a large `external` list (gRPC, kafkajs, mqtt, nats, ioredis, amqplib, the unused `@nestjs/microservices`/`websockets`/`swagger`/`mapped-types` packages, etc.) — these must remain external because they are optional NestJS transports that should not be bundled.
- `electron-builder` config lives in `package.json#build`. It bundles `release/build`, `node_modules`, `.config/buildResources/**/*`, and **`board_api/`** (the Django sidecar). The `afterSign` hook runs `.config/scripts/notarize.js` for macOS notarization.

### Environment variables

See `.env.example`. Important ones:
- `PORT` (default 3001) — renderer dev server, also polled by Electron during startup.
- `DJANGO_SERVER_PORT` (default 5000) — Django sidecar.
- `VITE_FIREBASE_*` — Firebase auth (renderer-only, prefix exposes them to Vite).
- `VITE_BACKEND_URL` / `VITE_COMPONENTS_STORE_URL` — remote services the renderer calls directly.
- `CATALOG_SERVICE_URL` / `AI_SERVICE_URL` — external sidecars.

## Conventions

- Conventional commits enforced via `commitlint.config.js` + Husky `commit-msg` hook. Use `npm run commit` when in doubt.
- React generators are configured for SCSS + Vite + ESLint + Jest (see `nx.json#generators`).
- The default Nx project is `renderer` (`nx.json#defaultProject`), so bare `npx nx <target>` operates on it.
- Jest config in `apps/renderer/jest.config.ts` overrides `@components` / `@pages` aliases to point at lib `index.ts` files — keep these in sync with `tsconfig.base.json` if either alias changes.

## Things that are easy to get wrong

- The NestJS API runs **in the Electron main process**, not as a separate node process. `ServerController` is instantiated via `require('@api')` inside `ServerManager.createServer()` — touching the API module graph affects Electron startup.
- `apps/electron/src/core/electron_app.ts` polls `127.0.0.1:$PORT` for up to 10s waiting for the renderer dev server before creating the BrowserWindow. If you change the renderer port, change `PORT` in `.env`, not the polling logic.
- `createHashRouter` (not `createBrowserRouter`) is required in `apps/renderer/src/app/App.tsx`; do not "fix" it back to BrowserRouter — packaged Electron loads from `file://` and BrowserRouter breaks.
- The `python_deneme/` directory at the repo root is experimental scratch and **not** the runtime Django sidecar (which lives in `board_api/` outside this repo).
- `npm run test:unit` skips `electron`, `diagrams`, `ai-modules`, and e2e projects on purpose — adding tests to those projects requires updating the script.
