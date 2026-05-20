# Renderer (`apps/renderer` + `libs/components` + `libs/diagrams` + `libs/pages`)

Vite-served React 18 app that mounts the react-diagrams canvas. Lives at
port 3001 in dev, served from `file://` in packaged builds.

## Entry / providers

`apps/renderer/src/main.tsx` → `App.tsx` uses `createHashRouter`
(BrowserRouter breaks `file://`). Provider chain:

```
ErrorBoundary → QueryClientProvider → MUI ThemeProvider
  → NotificationProvider → AuthProvider (Firebase) → router
```

Pages from `libs/pages`: `SignIn`, `SignUp`, `DashboardPage`,
`BoardPage`, `ProjectDetailPage`, `ProfilePage`.

## Editor singleton

`libs/components/src/core/editor.ts` — `Editor.getInstance()`. Holds the
react-diagrams engine, project manager, navigation stack, AI config.

Key methods:
- `activeModel` → `DiagramModel` (current canvas)
- `loadProject(jsonModel, filename)` → reloads via `projectManager`
- `removeNode(node)` → calls `node.remove()` + `engine.repaintCanvas()`
- `serialise(aiConfig?)` → full editor JSON

`ProjectManager.loadProject` calls `model.deserializeModel(editor, engine)`,
which is react-diagrams' canonical path: factory.generateModel per node,
then node.deserialize copies `event.data.data` onto the model.

## Architecture bridge (`libs/components/src/core/architecture-bridge.ts`)

Polls the NestJS API every 2s and applies updates locally.

```
startArchitectureBridge(apiUrl, onLoaded?, pollMs?)
  ├── pollOnce(url) — every 2s
  │     GET /api/architecture/latest
  │     if receivedAt > lastReceivedAt:
  │         applyToEditor(message)
  │             - normaliseBundle (basic.code.<hash> → basic.code,
  │               backfill node.data.code from dep.code, etc.)
  │             - if mode === 'replace': editor.loadProject(replace)
  │             - else: merge with current editor.serialise() and reload
  ├── pollDeletions(url) — every 2s
  │     GET /api/architecture/deletions?since=<lastDeletionAt>
  │     for each new entry: applyDeletionLocally(ids)
  │         - editor.removeNode per matching node (no canvas reload!)
  └── syncIfDrifted(url) — once on boot, +2.5s delay
        GET /api/architecture/state
        if local has more nodes than server:
            POST /api/architecture/sync { architecture: local }
```

`mergeBundles(current, incoming, message)` mirrors the API's merge:
- editor.layers merge per-layer-type (Object.assign of models)
- diagram-nodes: shift incoming X by `existingMaxX + 320 - incomingMinX`
  so freshly-pushed nodes don't overlap the existing graph
- diagram-links: same shift for points
- design.graph.blocks: id-aware overwrite (same fix as API)
- design.graph.wires: concat
- dependencies: shallow merge
- package: incoming overwrites if present (so `update_project_settings` works)

`normaliseBundle` repairs older-format pushes:
- `basic.code.<hash>` → `basic.code` (extras.dependency_id keeps the hash)
- `diagram-default` ports → `port.input` / `port.output`
- `diagram-default` links → `default`
- If node.data is missing or `data.code` empty: backfill from dep
  (also pulls aiDescription, params)
- Default `frequency: "1"`, default ports skeleton

## Block types

In `libs/components/src/components/blocks/`:

| Folder | Model | What it is |
|---|---|---|
| `basic/code` | `CodeBlockModel` | Single Python function block, ports declared in `data.ports.{in,out}`. The MonacoEditor renders `data.code` |
| `basic/ai-code` | `AiCodeBlockModel` | Same but with LLM-driven generation |
| `basic/input` | `InputBlockModel` | One-port input (used inside packages) |
| `basic/output` | `OutputBlockModel` | One-port output (used inside packages) |
| `basic/constant` | `ConstantBlockModel` | Constant with `{name, value, local}` data |
| `package` | `PackageBlockModel` | Hierarchical container. Reads `design.graph.blocks` directly to enumerate its outer ports |
| `collection` | various | Pre-built catalog blocks |
| `common/base-model` | `BaseModel<D>` | shared base class — `data: D`, `getData()`, `setData()` |

`PackageBlockModel` constructor walks `options.design.graph.blocks` and
for each `basic.input` / `basic.output` adds a corresponding outer port
(with `name = block.id`, `label = block.data.name`). Same model
deserialize-reads `data`, `model`, `info`, `design`, `dependencies`
from the serialised node — so those top-level fields MUST exist on the
outer node, not just in the dep map. `build_package_node` puts them
there explicitly.

## React Diagrams quirks

- The factory's `generateModel(event)` constructs the model from
  `event.initialConfig` (serialised node data). The constructor's
  `addPort` calls and a subsequent `deserialize` both touch `ports` —
  for `PackageBlockModel`, the constructor populates the outer ports
  list from `design.graph.blocks`. Later `deserialize` replaces them
  with the serialised port models. They must agree, or
  `getInputs()`/`getOutputs()` returns mismatched ports.
- A re-pushed node with the same id replaces the existing model only if
  `merge` deduplicates by id (we patched this — see
  `architecture-bridge.ts mergeBundles` and `service.ts mergeArchitecture`).
- `MonacoEditor` reads `defaultValue` on mount; later `state` changes
  don't update the editor. Push-then-edit-then-push flows reload the
  whole project so the widget remounts. Inline edits during runtime
  push won't appear until the user reopens the file.
