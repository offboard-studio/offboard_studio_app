# Known Gaps

Machine-readable worklist for the `audit-and-fix` routine. Each entry
has a stable id, a status, a priority, and an "acceptance" sentence
the routine uses to decide whether its fix landed.

When fixed: flip `status: open` → `status: done` and append a one-line
resolution (commit hash / PR number / quick note). Do NOT renumber.

---

## G-01 — `update_node` cannot edit a package's inner basic.code
- **status:** open
- **priority:** high
- **area:** mcp
- **trigger:** user wants to change frequency/code of a package node from MCP
- **acceptance:** `update_node` against a `block.package` target updates the
  inner `basic.code`'s `data.code` / `data.frequency` AND mirrors to the
  corresponding inner block in `dep.design.graph.blocks`.
- **hints:** server.py `update_node` handler currently only touches the
  outer node's data. Add a branch: if `node["type"] == "block.package"`,
  locate the inner basic.code inside `node["model"].layers["diagram-nodes"]`
  and inside `dep["design"]["graph"]["blocks"]` (same block id), patch both.

## G-02 — no `update_package_constant` tool
- **status:** open
- **priority:** medium
- **area:** mcp
- **trigger:** user wants to set a single constant value (Kp = 0.7) without
  rebuilding the package.
- **acceptance:** new MCP tool `update_package_constant(node, constant_name,
  value)` patches the matching `basic.constant` block's `data.value` inside
  both the inner editor and the dep graph; pushes a node-only patch.

## G-03 — no `connect_nodes` / `disconnect_wire` tool
- **status:** open
- **priority:** high
- **area:** mcp
- **trigger:** auto-wire chose the wrong target; user wants to redirect a
  wire without rebuilding the node.
- **acceptance:** `connect_nodes(src_node_id, src_port_label, tgt_node_id,
  tgt_port_label)` returns the new wire id; `disconnect_wire(wire_id)` or
  `disconnect_wire(src, src_port, tgt, tgt_port)` removes it. Both push as
  patches; renderer reflects without full reload.

## G-04 — no catalog integration
- **status:** open
- **priority:** high
- **area:** mcp + catalog
- **trigger:** Claude generates ROS blocks from scratch every time instead
  of reusing tested components-store blocks.
- **acceptance:** `catalog_list_blocks(group?)` returns block metadata
  (id, name, ports). `add_node_from_catalog(group, name)` instantiates a
  block from the catalog (`:3000`), wires it against the canvas. Both
  fail gracefully when `:3000` is unreachable.
- **hints:** `core/context.py _gather_catalog` already knows the endpoint
  shape — `/api/blocks/categories`, `/api/blocks/<group>`. Use the same.

## G-05 — `create_package_node` cannot set inner code frequency
- **status:** open
- **priority:** medium
- **area:** mcp
- **trigger:** every package starts at 1 Hz; tuning requires UI or post-hoc
  `update_node` (which doesn't work on packages — see G-01).
- **acceptance:** `create_package_node(..., code_frequency="20")` sets the
  inner basic.code's `data.frequency` at build time. `add_node` (flat)
  gets the same parameter.

## G-06 — `move_node` / `rename_node` not exposed
- **status:** open
- **priority:** low
- **area:** mcp
- **trigger:** auto-layout puts each new node at `existing_max_x + 320` y=150;
  canvas scrolls right indefinitely.
- **acceptance:** `move_node(node_id, x, y)` updates `node.x/y` and mirrors
  to `design.graph.blocks[].position`. `rename_node(node_id, new_name)`
  updates `extras.name` and `data.name`.

## G-07 — bridge is HTTP-poll only, not Socket.IO
- **status:** open
- **priority:** medium
- **area:** renderer
- **trigger:** delete operations have ~2s perceived lag; the gateway
  already emits `architecture:removed` over Socket.IO but the bridge
  doesn't listen.
- **acceptance:** bridge subscribes to `architecture:load|removed|cleared`
  via `socket.io-client`. Fallback to HTTP polling when the socket can't
  connect. Removes the `lastReceivedAt`/`lastDeletionAt` cursors.

## G-08 — `save_architecture` exists but no `load_architecture`
- **status:** open
- **priority:** low
- **area:** mcp
- **trigger:** the user can save a project to disk via MCP but cannot reload it.
- **acceptance:** `load_architecture(path, mode="append"|"replace")` reads
  the JSON, pushes via `/load`. Optional `seed: true` posts to `/sync` so
  the renderer takes it as authoritative without emitting `loaded`.

## G-09 — Bidirectional UI ↔ MCP sync
- **status:** open
- **priority:** medium
- **area:** api + renderer
- **trigger:** user edits a constant in the UI; MCP `gather` still sees
  the old value until the next push. UI edits don't reach the accumulator.
- **acceptance:** the renderer (probably via `architecture-bridge`) POSTs
  `/sync` whenever the editor's `setModelChanged` callback fires, debounced.
  `gather_project_context` then sees current UI state.

## G-10 — No `duplicate_node` / `clone_package`
- **status:** open
- **priority:** low
- **area:** mcp
- **trigger:** user wants three identical sensor subscribers; MCP forces
  three full `create_package_node` calls.
- **acceptance:** `duplicate_node(source_node_id, count=1)` creates N
  copies with new node ids (same dep id) and pushes them.

## G-11 — `_push_patch` is single-node only
- **status:** open
- **priority:** low
- **area:** mcp
- **trigger:** Bulk frequency updates (e.g. set 6 nodes to 20 Hz) are
  six sequential network calls.
- **acceptance:** `_push_patch_many(api_url, patches=[...])` accepts a
  list of `{node_model, block, dependency?}` and POSTs a single bundle.
  `update_node_many` (or a `nodes: [...]` array on `update_node`) uses it.

## G-12 — Empty MCP `examples/`
- **status:** open
- **priority:** low
- **area:** docs
- **trigger:** the only worked examples are in chat history.
- **acceptance:** `mcp/examples/` has at least three runnable JSON
  bundles: a flat basic.code chain, a package with constants, and a
  composer package using `nested_packages`.

## G-13 — Restart loses accumulator if renderer canvas is empty
- **status:** open
- **priority:** medium
- **area:** api
- **trigger:** Electron restart wipes in-memory accumulator. `syncIfDrifted`
  only seeds when local has nodes; cold-boot before File→Open leaves the
  accumulator permanently empty.
- **acceptance:** `accumulated` is persisted to disk on every push (e.g.
  `~/.offboard/accumulator.json`) and reloaded on boot.

## G-14 — No automated tests for package builder
- **status:** open
- **priority:** medium
- **area:** mcp
- **trigger:** `build_package_node` recursive logic has only smoke tests.
- **acceptance:** `mcp/tests/test_package.py` covers: flat package, package
  with constants, two-level nesting, label collision resolution, missing
  code+nested_packages error.

## G-15 — LLM-generated code sandbox is shallow
- **status:** open
- **priority:** low
- **area:** projects
- **trigger:** Policy Executor in the LLM Robot uses a banned-substring
  filter; production-unsafe.
- **acceptance:** documented or implemented constraint: either
  (a) banner in package description warning it's demo-only, or
  (b) actual subprocess sandbox with resource limits.

---

## Conventions for the routine

- Pick the **lowest-numbered open entry with priority high → medium → low**.
- Skip entries flagged `status: blocked` or `status: in-progress`.
- One gap per run; if a gap fix gets stuck, mark it `status: blocked`
  with a one-line reason and move on next cycle.
- Always run `npx tsc --noEmit` for affected TS projects and the MCP
  Python smoke (`PYTHONPATH=src .venv/bin/python -c "..."`) before
  considering the gap done.
- Commit on a branch `chore/gap-G-XX-<slug>` and open a PR; do NOT push
  directly to `new_master` / `nestjs_release`.
