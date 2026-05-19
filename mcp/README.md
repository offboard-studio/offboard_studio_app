# Offboard Studio MCP Server

A Python [Model Context Protocol](https://modelcontextprotocol.io/) server
that lets any MCP-capable LLM client (Claude Code, Cursor, etc.) build
Offboard Studio architectures the same way the renderer would — but
programmatically, from natural-language instructions.

It exposes the deterministic primitives that were originally sketched in
`python_deneme/ollama10*.py` (node creation, auto-wiring, hierarchical
packages) as proper MCP tools, plus a `generate_with_backend_ai` proxy
that forwards prompts to the Django backend's
`/api/v1/ai/generate-architecture` endpoint.

## What the server can do

| Tool                       | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `create_node`              | One node JSON fragment (editor model + design block + dep).  |
| `create_architecture`      | Full `editor + design + dependencies` bundle with auto-wire. |
| `auto_wire_existing`       | Re-wire a pre-built node list.                               |
| `nest_nodes`               | Wrap a sub-graph as ONE packaged node (node-in-node).        |
| `validate_architecture`    | Structural sanity check.                                     |
| `save_architecture`        | Persist a bundle to disk, ready for File → Open.             |
| `push_to_app`              | POST to the running NestJS API (`:3333`); renderer auto-loads it. |
| `gather_project_context`   | Snapshot live app state: current architecture + block catalog + AI providers. |
| `assist_project_request`   | One-shot: gather context → ask backend AI (enriched prompt) → push to app. |
| `generate_with_backend_ai` | Plain proxy to Django `/api/v1/ai/generate-architecture`.    |

All bundles share the exact JSON shape `Editor.loadProject` already
accepts, so the renderer doesn't need to learn anything new.

## Install

The server needs **Python 3.10 or newer** because the `mcp` SDK does. On
macOS you usually already have a modern Python via Homebrew
(`/opt/homebrew/bin/python3.13` or similar). Don't use the system
`python3` shipped with Xcode — that's still 3.9.

### Quick path (no editable install, no shell entry point)

```bash
cd mcp
python3.13 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
./run.sh                  # starts the server on stdio
```

`run.sh` sets `PYTHONPATH=src` and runs `python -m offboard_mcp.server`,
so the package doesn't have to be installed.

### Editable install (puts `offboard-mcp` on PATH)

Requires `pip >= 21.3` (PEP 660). If your pip is older, run
`pip install --upgrade pip` first.

```bash
cd mcp
python3.13 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e .
offboard-mcp              # starts the server on stdio
```

## Register with an MCP client

### Claude Code (per-project `.mcp.json`)

Drop `examples/claude_code_mcp_config.json` into the project root as
`.mcp.json` (or merge it into your existing one), then restart Claude
Code. Tools surface under the `offboard-studio` namespace.

```json
{
  "mcpServers": {
    "offboard-studio": {
      "command": "offboard-mcp",
      "env": {
        "OFFBOARD_BACKEND_URL": "http://localhost:8000",
        "OFFBOARD_MCP_OUTPUT_DIR": "./release/ai-generated"
      }
    }
  }
}
```

### Cursor / other clients

Any client that speaks the MCP stdio transport will work — point its
config at the `offboard-mcp` executable.

## Environment

| Variable                    | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `OFFBOARD_BACKEND_URL`      | Where `generate_with_backend_ai` POSTs. Default `http://localhost:8000`. |
| `OFFBOARD_BACKEND_TOKEN`    | Optional bearer token added to the proxy request.                  |
| `OFFBOARD_API_URL`          | Where `push_to_app` POSTs. Default `http://localhost:3333` (the NestJS API the Electron app exposes). |
| `OFFBOARD_MCP_OUTPUT_DIR`   | Default output dir for `save_architecture`. Defaults to CWD.       |
| `OFFBOARD_MCP_LOG`          | Python logging level. Default `INFO`.                              |

## Worked examples

See `examples/sample_call.md` for the JSON payloads each tool expects.

## Workflow with the running app

```
              ┌─────────────────────────────────────────┐
LLM client    │ "Build me a vision pipeline for an RRR  │
(Claude Code) │  arm. Make the planner reusable."       │
              └────────────────────┬────────────────────┘
                                   │ MCP stdio
                                   ▼
                  ┌──────────────────────────────┐
                  │ offboard-mcp (this server)   │
                  │  - create_architecture       │
                  │  - nest_nodes                │
                  │  - save_architecture         │
                  └──────────────┬───────────────┘
                                 │ writes
                                 ▼
                  release/ai-generated/rrr_arm.json
                                 │
                                 ▼
              File → Open in the Offboard Studio renderer
```

For prompts that need an LLM in the loop, the `generate_with_backend_ai`
tool offloads everything to Django + the FastAPI `ai_service` sidecar,
which already has Anthropic/OpenAI/Ollama swap-in providers.

## Library use

The same primitives are importable without MCP:

```python
from offboard_mcp import NodeSpec, PortSpec, build_architecture

arch = build_architecture([
    NodeSpec(name="Camera Capture", outputs=[PortSpec("Image", "out")]),
    NodeSpec(name="ArUco Detector",
             inputs=[PortSpec("Image", "in")],
             outputs=[PortSpec("Pose", "out")]),
])
```

That makes the library reusable from the Django backend, from tests, or
from one-off scripts that don't want to spin up an MCP transport.
