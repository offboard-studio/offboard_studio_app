---
name: Offboard MCP architecture & push pipeline
description: How the MCP server, NestJS API accumulator, renderer bridge, and react-diagrams editor fit together. Names of the build/push helpers and when to use which create tool (basic.code vs block.package).
type: reference
originSessionId: e3b14804-ed89-4166-aa6b-197d66d10f2d
---
The MCP server (`mcp/src/offboard_mcp`) is a stateless command layer. All
persistent state lives in the NestJS API's `ArchitectureService`
(`apps/api/src/app/architecture/architecture.service.ts`). The renderer
bridge (`libs/components/src/core/architecture-bridge.ts`) polls the API and
applies updates to the live `react-diagrams` editor.

## Push pipeline

```
MCP tool ──HTTP POST──▶ /api/architecture/load (controller)
                         │
                         ▼
                     ArchitectureService.push(payload, source)
                         │  - merges into `accumulated` via mergeArchitecture
                         │    (id-aware block merge; package overwrites)
                         │  - stores last raw push in `latest`
                         │  - emits 'loaded' (gateway → Socket.IO)
                         ▼
                 Renderer bridge poll cycle (~2s)
                    GET /api/architecture/latest
                         │
                         ▼
                     applyToEditor(message)
                         │  - normaliseBundle (backfill code from deps, etc.)
                         │  - if mode === 'replace': editor.loadProject(replace)
                         │  - else: merge with current editor.serialise() and
                         │    editor.loadProject(merged)
```

## Surgical delete pipeline

`delete_nodes` does NOT use the push pipeline (which forces a reload):

```
MCP delete_nodes ──POST /api/architecture/remove-nodes──▶ service.remove(ids)
                                                          │
                                                          ▼ - drops nodes/links from accumulator
                                                            - GCs orphan deps
                                                            - appends to `deletions[]` log
                                                            - emits 'removed'
Renderer bridge poll: GET /api/architecture/deletions?since=<lastAt>
                       │
                       ▼ applyDeletionLocally(ids)
                          - editor.removeNode(node) per id (no canvas reload)
```

## Build helpers (Python)

- `core/nodes.build_node(spec)` — flat `basic.code` node. Returns
  `{node_id, dependency_id, node_model, block, dependency}`.
- `core/package.build_package_node(...)` — `block.package` node. Builds
  inner `basic.input/output/constant/code` blocks PLUS, when
  `nested_packages` is given, embedded `block.package` instances —
  recursively. Outer node carries `data, model, info, design,
  dependencies` because `PackageBlockModel.deserialize` reads them
  directly (NOT just `data`).
- `core/wiring.wire_against_existing(new_built, existing_nodes, mode)`
  — label + data_type compatibility match. New outputs → existing
  inputs AND existing outputs → new inputs. "nearest" claims first
  unused output per input; "broadcast" fans out.

## Push helpers (server.py)

- `_push_patch(api_url, node_model=, block=, dependency=, source=)` —
  append-mode bundle carrying ONLY the touched entries. The merge on
  both server (`mergeArchitecture` id-aware blocks) and renderer
  (`mergeBundles` id-aware blocks) overwrites in place. Use for
  `update_node` and any single-node modification.
- `_push_replace(...)` — DEPRECATED. Kept only as a reference helper.
  Replace-mode push wipes nodes the accumulator never saw (e.g. File
  → Open). Avoid; prefer `_push_patch` + `start_new_project`.

## When to use which create tool

- **`create_node`** — JSON-only fragment, no push. Almost never the
  right tool from MCP; use it only when assembling a custom bundle.
- **`add_node`** — flat `basic.code`. The right call when the user
  wants a small standalone snippet: counter, transform, single
  publisher/subscriber. With `block_kind="package"` it delegates to
  `create_package_node`.
- **`create_package_node`** — `block.package`. The right call when
  the node has tunable constants the user should edit from the UI,
  when it bundles multiple related concerns, or when it should host
  nested packages.
- **`start_new_project`** — fresh canvas + new settings, one call.
  Trigger on topic shift (see `feedback_new_project_on_topic_shift.md`).
- **`update_node`** — patch one node in place; mirrors changes to the
  shared dependency only if exactly one node uses it. Doesn't reach
  inside a `block.package` (yet) — its inner `basic.code` frequency
  must be edited from the UI.
- **`delete_nodes`** — surgical removal via the dedicated endpoint;
  preserves nodes the accumulator never saw.

## Inside a `block.package`

The package's `node.model.layers` is a self-contained sub-editor
(react-diagrams format) with its own `diagram-nodes` and
`diagram-links` layers. The `dependency.design.graph` is the runtime
twin (block IDs + semantic wires by name). Port-name conventions:

- `basic.input(X).input-out` → carries the value labeled X
- `basic.constant(C).constant-out` → carries the value labeled C
- `basic.code` / nested `block.package` ports → labeled by their own port name
- `basic.output(Y).output-in` → consumes the value labeled Y

The outer node's port `name` field equals the inner basic.input /
basic.output block id (NOT the label). The label drives auto-wire.

## Common pitfalls

- Pushing a bundle with empty `editor.layers` won't drop existing
  nodes (merge is additive). Use `remove-nodes` or
  `start_new_project` to clear.
- Outer port labels matter — wire_against_existing matches by label,
  so a `target_lat` output won't connect to a `targetLat` input.
- `update_node` doesn't update the inner `basic.code` of a
  `block.package` — that's a known gap. For frequency tweaks inside
  packages, edit from the UI or extend `update_node` to be
  package-aware.
