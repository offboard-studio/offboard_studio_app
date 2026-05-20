# NestJS API (`apps/api/src/app/architecture`)

Runs in-process with Electron main. The MCP server and any other client
talk to it over HTTP on `:3333/api/architecture/*`. A Socket.IO gateway
emits events for real-time consumers, but the renderer bridge prefers
polling for resilience.

## Endpoints

| Method | Path | Body / Query | Behaviour |
|---|---|---|---|
| `POST` | `/api/architecture/load` | `{architecture, source?}` | Push a bundle. Merges into the accumulator (default) or replaces it (`architecture.mode === 'replace'`). Updates `latest` and emits `loaded`. |
| `GET` | `/api/architecture/latest` | — | Last raw push, unmerged. Used by the bridge to detect new pushes. |
| `GET` | `/api/architecture/state` | — | The merged accumulator (`{receivedAt, architecture}`). Read this from outside the renderer to see the live canvas. |
| `POST` | `/api/architecture/sync` | `{architecture}` | Seed/replace the accumulator with the renderer's authoritative state. Does NOT emit `loaded`. Used by `syncIfDrifted` on bridge boot. |
| `POST` | `/api/architecture/remove-nodes` | `{node_ids: string[]}` | Surgical removal: drops nodes/links from accumulator, GCs orphan deps, appends to `deletions[]` log, emits `removed`. |
| `GET` | `/api/architecture/deletions` | `?since=<ISO>` | Deletion log since the given timestamp. The bridge polls this in tandem with `/latest`. |
| `DELETE` | `/api/architecture/latest` | — | Hard clear: drops `latest`, `accumulated`, and `deletions[]`. Emits `cleared`. |

## Service (`architecture.service.ts`)

```
ArchitectureService extends EventEmitter
  private latest:        LoadedArchitecture | null
  private accumulated:   Record<string, unknown> | null
  private accumulatedAt: string | null
  private deletions:     Array<{ ids: string[]; at: string }>

  push(payload, source)               → emit 'loaded'
  remove(node_ids)                    → emit 'removed'
  seed(architecture)                  → silent (no 'loaded')
  clear()                             → emit 'cleared'
  getLatest() / getAccumulated() / getDeletionsSince(since)
```

### `mergeArchitecture(accumulated, incoming)`

- **editor.layers**: per-layer-type model merge. `Object.assign` against
  the existing models map → same-id models overwrite.
- **design.graph.blocks**: id-aware merge. A re-pushed block with the
  same id REPLACES the accumulated copy (used by `update_node`).
  Plain concat would have left the stale copy and silently ignored the new.
- **design.graph.wires**: concat (duplicates possible — bridge tolerates).
- **dependencies**: shallow merge (incoming overwrites on key collision).
- **package**: explicit overwrite when incoming carries one. Previous
  "first-set wins" rule silently dropped `update_project_settings`.

### `remove(node_ids)`

1. Drop ids from `accumulated.editor.layers[diagram-nodes].models`.
2. Drop any link in `diagram-links` touching a removed id.
3. Filter `design.graph.blocks` / `wires` to drop the same.
4. GC dependencies no longer referenced by any remaining node.
5. Push entry to `deletions[]` (capped at 200), emit `removed`.

## Gateway (`architecture.gateway.ts`)

Re-emits `service.on('loaded' | 'cleared' | 'removed')` over Socket.IO
namespace `/architecture`:

- `architecture:load` — full LoadedArchitecture record
- `architecture:cleared` — `{}`
- `architecture:removed` — `{ids: string[], at: string}`

Renderer doesn't subscribe yet (gap `G-09` — real-time channel).

## Module wiring

`architecture.module.ts` registers `ArchitectureController`,
`ArchitectureService`, and `ArchitectureGateway`. `AppModule` imports
it alongside `AppController2` from `@ai-modules` and `DeploymentModule`.

`apps/api/src/index.ts` exports `ServerController` (boots `AppModule`,
returns `getAppIPCService` etc. for direct cross-process calls from
electron-main).
