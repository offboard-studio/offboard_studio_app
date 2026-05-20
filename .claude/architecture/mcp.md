# MCP Server (`mcp/src/offboard_mcp`)

A stdio MCP server that lets Claude Code / Cursor manipulate the running
Offboard Studio canvas. All state lives on the NestJS API; this server
is a stateless command layer.

Launch: `mcp/run.sh` (uses `mcp/.venv/bin/python` if present, falls back
to `python3`). `.mcp.json` at repo root registers it as `offboard-studio`.

## Tools (16 total)

### Snapshot / read

- **`gather_project_context`** — full canvas snapshot from
  `/api/architecture/state` (NOT `/latest`). Returns nodes (with full
  `code` per node), dependencies (flat OR `kind: package` with inner
  blocks listed), catalog if `:3000` is up, backend AI provider list.
  Pass `include_code: false` for metadata-only.

### Build / push

- **`create_node`** — JSON-only fragment, no push. Rarely the right
  call from MCP.
- **`add_node`** — flat `basic.code` push, auto-wires by label against
  the canvas. `block_kind: "package"` delegates to `create_package_node`.
- **`create_architecture`** — full bundle from a list of NodeSpecs +
  auto-wire. Doesn't push to the running app by itself.
- **`create_package_node`** — `block.package` push. Builds inner
  `basic.input` / `basic.output` / `basic.constant` / `basic.code`
  blocks AND recursive nested packages via `nested_packages`.
- **`nest_nodes`** — older composer that wraps a list of NodeSpecs as
  ONE outer node. Superseded by `create_package_node`.

### Mutate

- **`update_node`** — patch a node by `node_id` or `name`. Modifiable:
  `code`, `frequency` (Hz), `params`, `description`. Mirrors to dep only
  if it has exactly one user. **Does NOT reach inside `block.package`
  yet** — this is gap `G-01` in `gaps.md`.
- **`delete_nodes`** — surgical removal via
  `POST /api/architecture/remove-nodes`. Renderer applies
  `editor.removeNode` per id (no full canvas reload).
- **`update_project_settings`** — patch the `package` field
  (name/description/author/version/image) without touching nodes.
- **`start_new_project`** — fresh canvas + new settings in one call.
  Trigger on topic shift.
- **`auto_wire_existing`** — re-wire an already-built node list.
- **`push_to_app`** — POST an architecture bundle to `/load`.
  Low-level escape hatch; prefer the higher-level tools.
- **`save_architecture`** — write a bundle to disk as JSON.
  *No matching `load_architecture` yet — gap `G-08`.*

### AI integration

- **`generate_with_backend_ai`** — proxy to Django's
  `/api/v1/ai/generate-architecture`. Returns a full bundle.
- **`assist_project_request`** — gather context → ask backend AI →
  optionally `push_to_app`. End-to-end natural-language entry point.

### Validation

- **`validate_architecture`** — structural sanity (dangling links,
  missing deps, unknown ports). Returns issues list.

## Build helpers (Python)

| Function | Returns | When |
|---|---|---|
| `core.nodes.build_node(spec)` | flat basic.code fragment | small standalone snippet |
| `core.package.build_package_node(...)` | block.package fragment with nested support | bundled node with constants / nested packages |
| `core.wiring.wire_against_existing(new, existing, mode)` | (link_models, wires) | auto-wire by label + data_type |

## Push helpers (server.py)

- `_push_patch(api_url, node_model=, block=, dependency=, source=)` —
  append-mode delta carrying ONLY the touched entries. Merge on both
  server (id-aware `mergeArchitecture`) and renderer (id-aware
  `mergeBundles`) overwrites in place. Used by `update_node`.

Older `_push_replace` was removed — replace-mode wipes nodes the
accumulator never saw (e.g. File → Open), which silently destroyed
user work. Use `start_new_project` for intentional clears.

## Inside a `block.package`

The package's `node.model.layers` is a self-contained sub-editor
(react-diagrams format with its own `diagram-nodes` and `diagram-links`
layers). The `dependency.design.graph` is the runtime twin (block IDs
+ semantic wires).

Port-name conventions inside a package:

- `basic.input(X).input-out` → carries the value labeled X
- `basic.constant(C).constant-out` → carries the value labeled C
- `basic.code` / nested `block.package` ports → labeled by their own port name
- `basic.output(Y).output-in` → consumes the value labeled Y

Outer port `name` field equals the inner basic.input / basic.output
block id (NOT the label). The label drives auto-wire.

## Reference: deferred tool schemas

Every tool above shows up in `mcp__offboard-studio__<name>` after
`/mcp` reconnects. Schemas are loaded on demand via `ToolSearch`.
