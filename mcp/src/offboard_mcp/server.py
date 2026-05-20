"""MCP server entry point — exposes Offboard Studio node primitives to LLM clients.

Tools:
  - create_node              Build one node JSON fragment.
  - create_architecture      Build a full editor+design+dependencies bundle.
  - auto_wire_existing       Wire an already-built node list.
  - nest_nodes               Wrap a sub-graph as a single packaged node.
  - validate_architecture    Structural sanity check on a bundle.
  - save_architecture        Write an architecture bundle to disk as a .json file.
  - generate_with_backend_ai Proxy to the backend `/api/v1/ai/generate-architecture`.

Run with:  `offboard-mcp` (after `pip install -e .`) or
           `python -m offboard_mcp.server`.

By default the server speaks stdio — that's what Claude Code / Cursor / any
other MCP client expect.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from offboard_mcp.core.architecture import build_architecture
from offboard_mcp.core.context import gather as gather_context
from offboard_mcp.core.nested import nest_subgraph
from offboard_mcp.core.nodes import NodeSpec, PortSpec, build_node
from offboard_mcp.core.package import build_package_node
from offboard_mcp.core.wiring import auto_wire, validate_architecture, wire_against_existing

logger = logging.getLogger("offboard_mcp")
logging.basicConfig(level=os.environ.get("OFFBOARD_MCP_LOG", "INFO"))


def _resolve_api_url(override: str | None) -> str:
    return (
        override
        or os.environ.get("OFFBOARD_API_URL")
        or "http://localhost:3333"
    ).rstrip("/")


async def _fetch_accumulator(api_url: str) -> dict[str, Any] | None:
    """Fetch the merged canvas snapshot from `/api/architecture/state`.

    Returns the inner `architecture` bundle (editor + design + dependencies)
    or None if the accumulator is empty / the API is unreachable.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{api_url}/api/architecture/state")
        if resp.status_code != 200:
            return None
        body = resp.json()
        arch = body.get("architecture")
        return arch if isinstance(arch, dict) else None
    except httpx.HTTPError:
        return None


def _find_node(
    arch: dict[str, Any],
    *,
    node_id: str | None = None,
    name: str | None = None,
) -> tuple[str, dict[str, Any]] | None:
    """Locate a node in an architecture bundle by id (exact) or name
    (case-insensitive, first match). Returns (node_id, node_model) or None."""
    layers = (arch.get("editor") or {}).get("layers") or []
    nodes_layer = next((L for L in layers if L.get("type") == "diagram-nodes"), {})
    models = nodes_layer.get("models") or {}
    if node_id and node_id in models:
        return node_id, models[node_id]
    if name:
        needle = name.strip().lower()
        for nid, n in models.items():
            if ((n.get("extras") or {}).get("name") or "").strip().lower() == needle:
                return nid, n
    return None


async def _push_patch(
    api_url: str,
    *,
    node_model: dict[str, Any] | None = None,
    block: dict[str, Any] | None = None,
    dependency: tuple[str, dict[str, Any]] | None = None,
    source: str,
) -> dict[str, Any]:
    """POST a minimal architecture delta in append mode — only the touched
    node/block/dep is included. The server-side mergeArchitecture overwrites
    accumulator entries with the same id, and the renderer's mergeBundles
    does the same for editor.layers.models. Everything else on the canvas
    stays put — including nodes the accumulator never saw (e.g. a project
    opened via File → Open before the API started accumulating).
    """
    bundle: dict[str, Any] = {
        "editor": {"layers": []},
        "design": {"graph": {"blocks": [], "wires": []}},
        "dependencies": {},
    }
    if node_model is not None:
        bundle["editor"]["layers"].append(
            {
                "type": "diagram-nodes",
                "models": {node_model["id"]: node_model},
            }
        )
    if block is not None:
        bundle["design"]["graph"]["blocks"].append(block)
    if dependency is not None:
        dep_id, dep = dependency
        bundle["dependencies"][dep_id] = dep
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{api_url}/api/architecture/load",
                json={"architecture": bundle, "source": source},
                headers={"Content-Type": "application/json"},
            )
        resp.raise_for_status()
        return {"ok": True, "status": resp.status_code, "body": resp.json()}
    except httpx.HTTPError as exc:
        logger.exception("push_patch failed (source=%s)", source)
        return {"ok": False, "error": str(exc)}


def _ports_from_payload(payload: list[dict[str, Any]] | None, direction: str) -> list[PortSpec]:
    if not payload:
        return []
    out: list[PortSpec] = []
    for item in payload:
        if isinstance(item, str):
            out.append(PortSpec(label=item, direction=direction))  # type: ignore[arg-type]
        elif isinstance(item, dict):
            out.append(
                PortSpec(
                    label=str(item.get("label") or item.get("name") or ""),
                    direction=direction,  # type: ignore[arg-type]
                    port_type=str(item.get("type", "any")),
                )
            )
    return [p for p in out if p.label]


def _node_specs_from_payload(payload: list[dict[str, Any]]) -> list[NodeSpec]:
    specs: list[NodeSpec] = []
    for item in payload:
        specs.append(
            NodeSpec(
                name=str(item.get("name", "Untitled")),
                description=str(item.get("description", "")),
                inputs=_ports_from_payload(item.get("inputs"), "in"),
                outputs=_ports_from_payload(item.get("outputs"), "out"),
                parameters=list(item.get("parameters", []) or []),
                code=str(item.get("code") or NodeSpec(name="").code),
                dependency_id=item.get("dependency_id"),
                block_type=str(item.get("block_type", "basic.code")),
            )
        )
    return specs


def _result(payload: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(payload, ensure_ascii=False, indent=2))]


server = Server("offboard-studio")


@server.list_tools()
async def list_tools() -> list[Tool]:
    node_schema = {
        "type": "object",
        "required": ["name"],
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "inputs": {
                "type": "array",
                "items": {
                    "oneOf": [
                        {"type": "string"},
                        {
                            "type": "object",
                            "required": ["label"],
                            "properties": {
                                "label": {"type": "string"},
                                "type": {"type": "string"},
                            },
                        },
                    ]
                },
            },
            "outputs": {"type": "array", "items": {"type": ["string", "object"]}},
            "parameters": {"type": "array", "items": {"type": "object"}},
            "code": {"type": "string"},
            "dependency_id": {"type": "string"},
            "block_type": {"type": "string"},
        },
    }

    return [
        Tool(
            name="create_node",
            description=(
                "Build one Offboard Studio node from a NodeSpec and return the "
                "editor/design/dependency fragments. Use this when the user wants "
                "a single new block."
            ),
            inputSchema=node_schema,
        ),
        Tool(
            name="create_architecture",
            description=(
                "Build a full editor + design + dependencies bundle from a list "
                "of NodeSpecs and auto-wire matching ports. The output JSON can "
                "be passed straight to Editor.loadProject in the renderer."
            ),
            inputSchema={
                "type": "object",
                "required": ["nodes"],
                "properties": {
                    "nodes": {"type": "array", "items": node_schema},
                    "wire_mode": {
                        "type": "string",
                        "enum": ["nearest", "broadcast"],
                        "default": "nearest",
                    },
                    "board": {"type": "string", "default": "Python3-Noetic"},
                    "project_name": {"type": "string"},
                    "project_description": {"type": "string"},
                },
            },
        ),
        Tool(
            name="auto_wire_existing",
            description=(
                "Re-wire an already-built list of nodes (each entry being the "
                "object returned by create_node). Useful after the user manually "
                "adds nodes one by one."
            ),
            inputSchema={
                "type": "object",
                "required": ["built_nodes"],
                "properties": {
                    "built_nodes": {"type": "array", "items": {"type": "object"}},
                    "mode": {
                        "type": "string",
                        "enum": ["nearest", "broadcast"],
                        "default": "nearest",
                    },
                },
            },
        ),
        Tool(
            name="nest_nodes",
            description=(
                "Wrap a list of inner NodeSpecs as ONE packaged node. The free "
                "ports of the inner graph become the external ports of the "
                "wrapper. Use for hierarchical reuse — node-in-node."
            ),
            inputSchema={
                "type": "object",
                "required": ["inner_nodes", "package_name"],
                "properties": {
                    "inner_nodes": {"type": "array", "items": node_schema},
                    "package_name": {"type": "string"},
                    "package_description": {"type": "string"},
                },
            },
        ),
        Tool(
            name="validate_architecture",
            description=(
                "Check an architecture bundle for dangling links, missing "
                "dependencies, and unknown ports. Returns a list of issues "
                "(empty list == valid)."
            ),
            inputSchema={
                "type": "object",
                "required": ["architecture"],
                "properties": {"architecture": {"type": "object"}},
            },
        ),
        Tool(
            name="save_architecture",
            description=(
                "Persist an architecture bundle to disk as JSON, ready to be "
                "opened with File → Open in the renderer. Returns the absolute "
                "path. Output dir defaults to OFFBOARD_MCP_OUTPUT_DIR env or CWD."
            ),
            inputSchema={
                "type": "object",
                "required": ["architecture", "filename"],
                "properties": {
                    "architecture": {"type": "object"},
                    "filename": {"type": "string", "description": "e.g. my_project.json"},
                    "output_dir": {"type": "string"},
                },
            },
        ),
        Tool(
            name="gather_project_context",
            description=(
                "Collect a live snapshot of the running Offboard Studio app: "
                "the architecture currently loaded in the editor, the block "
                "catalog exposed by the components-store, any singleton data, "
                "and which AI providers the Django backend can reach. Call "
                "this BEFORE planning a project so suggestions reference real "
                "block types and don't duplicate what's already on the canvas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "api_url": {"type": "string"},
                    "catalog_url": {"type": "string"},
                    "backend_url": {"type": "string"},
                    "include_catalog": {"type": "boolean", "default": True},
                    "expand_catalog_groups": {
                        "type": "boolean",
                        "default": False,
                        "description": "If true, fetch every group's block list too. Heavier.",
                    },
                    "include_code": {
                        "type": "boolean",
                        "default": True,
                        "description": (
                            "Include the full Python source of every node + dependency. "
                            "Set false for a lighter metadata-only snapshot."
                        ),
                    },
                },
            },
        ),
        Tool(
            name="assist_project_request",
            description=(
                "End-to-end helper: gather live project context, ask the "
                "Django backend AI to plan the requested project (prompt is "
                "automatically enriched with the current architecture and "
                "block catalog), then optionally push the result into the "
                "running app. Use this when the user describes what they "
                "want in natural language."
            ),
            inputSchema={
                "type": "object",
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string"},
                    "auto_push": {
                        "type": "boolean",
                        "default": True,
                        "description": "POST the result to /api/architecture/load.",
                    },
                    "include_catalog": {"type": "boolean", "default": True},
                    "expand_catalog_groups": {"type": "boolean", "default": False},
                    "api_url": {"type": "string"},
                    "backend_url": {"type": "string"},
                    "auth_token": {"type": "string"},
                },
            },
        ),
        Tool(
            name="push_to_app",
            description=(
                "POST an architecture bundle to the running NestJS API "
                "(`/api/architecture/load`). The renderer is listening over "
                "Socket.IO and will auto-load the result — use this when the "
                "Offboard Studio app is running and you want to see the graph "
                "immediately. The architecture must include editor + design + "
                "dependencies (e.g. the output of create_architecture)."
            ),
            inputSchema={
                "type": "object",
                "required": ["architecture"],
                "properties": {
                    "architecture": {"type": "object"},
                    "api_url": {
                        "type": "string",
                        "description": "Override OFFBOARD_API_URL env. Default http://localhost:3333.",
                    },
                    "source": {
                        "type": "string",
                        "description": "Free-form tag included in the renderer notification.",
                        "default": "mcp",
                    },
                },
            },
        ),
        Tool(
            name="add_node",
            description=(
                "Add ONE node to the currently-running app: build the node, "
                "fetch the live canvas, auto-wire its ports against existing "
                "nodes (label + data_type compatibility), and POST the result "
                "to `/api/architecture/load` in append mode. Use this when the "
                "user wants to grow the graph incrementally — it does the "
                "create_node + auto-wire + push_to_app round-trip in one call."
            ),
            inputSchema={
                "type": "object",
                "required": ["name"],
                "properties": {
                    **node_schema["properties"],
                    "block_kind": {
                        "type": "string",
                        "enum": ["code", "package"],
                        "default": "code",
                        "description": (
                            "'code' (default) → flat basic.code node, like the "
                            "old behaviour. 'package' → block.package with "
                            "inner basic.input/output/constant/code blocks "
                            "(see create_package_node). Use 'package' when the "
                            "node has tunable constants the user should edit "
                            "from the UI."
                        ),
                    },
                    "constants": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": (
                            "Only used when block_kind='package'. Each entry "
                            "becomes a basic.constant block: {name, value}."
                        ),
                    },
                    "wire_mode": {
                        "type": "string",
                        "enum": ["nearest", "broadcast"],
                        "default": "nearest",
                        "description": (
                            "'nearest' wires each new port to its first match. "
                            "'broadcast' fans out — every match gets a link."
                        ),
                    },
                    "auto_wire": {
                        "type": "boolean",
                        "default": True,
                        "description": "Set false to add the node without wiring.",
                    },
                    "auto_push": {
                        "type": "boolean",
                        "default": True,
                        "description": (
                            "Set false to return the built node + computed wires "
                            "without POSTing. Caller can push manually later."
                        ),
                    },
                    "api_url": {"type": "string"},
                    "source": {"type": "string", "default": "add_node"},
                },
            },
        ),
        Tool(
            name="start_new_project",
            description=(
                "Begin a fresh project on a clean canvas. In one call: "
                "surgically removes every node currently in the accumulator "
                "(no full canvas reload), then updates Project Settings with "
                "the supplied name / description / author / version. Use "
                "this when the user requests a project on a clearly different "
                "domain than what's already on the board — wheeled robot to "
                "USV, USV to arm, arm to drone, etc. — instead of piling new "
                "nodes on top of an old graph.\n\n"
                "If the user is *extending* the current project (\"ekle\", "
                "\"bağla\", \"buna ek olarak\"), DON'T call this — just keep "
                "adding nodes with create_package_node / add_node."
            ),
            inputSchema={
                "type": "object",
                "required": ["name"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "author": {"type": "string"},
                    "version": {"type": "string", "default": "0.1.0"},
                    "image": {"type": "string"},
                    "api_url": {"type": "string"},
                    "source": {
                        "type": "string",
                        "default": "start_new_project",
                    },
                },
            },
        ),
        Tool(
            name="update_project_settings",
            description=(
                "Update the project's metadata — name, description, author, "
                "version, image — i.e. what the Project Settings panel "
                "shows. Sends a patch push that only carries `package: {...}`; "
                "nodes / wires / dependencies stay untouched.\n\n"
                "All fields are optional. Unspecified fields keep their "
                "current value (read from the accumulator's package). "
                "Pass `image` as a data: URL or remote URL."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "author": {"type": "string"},
                    "version": {"type": "string"},
                    "image": {
                        "type": "string",
                        "description": "data:image/... URL or remote URL.",
                    },
                    "api_url": {"type": "string"},
                    "source": {
                        "type": "string",
                        "default": "update_project_settings",
                    },
                },
            },
        ),
        Tool(
            name="create_package_node",
            description=(
                "Build a `block.package` node — a hierarchical container that "
                "wraps a sub-graph of `basic.input` / `basic.output` / "
                "`basic.constant` / `basic.code` blocks behind one canvas "
                "tile. This is what the Offboard Studio UI produces when a "
                "user 'collapses' a graph (e.g. the PID example).\n\n"
                "Use this instead of `create_node` / `add_node` when the "
                "node has tunable constants the user should be able to edit "
                "from the UI, or when the logic is meaningfully bigger than "
                "a single function and benefits from named inputs/outputs.\n\n"
                "The result is auto-wired against the current canvas (same "
                "label compatibility as add_node) and pushed in append mode."
            ),
            inputSchema={
                "type": "object",
                "required": ["name", "code"],
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "inputs": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Outer input port labels (one basic.input block per entry).",
                    },
                    "outputs": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Outer output port labels (one basic.output block per entry).",
                    },
                    "constants": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name"],
                            "properties": {
                                "name": {"type": "string"},
                                "value": {"type": ["string", "number"]},
                            },
                        },
                        "description": "Constants visible inside the package (basic.constant blocks). The basic.code reads each by name.",
                    },
                    "code": {
                        "type": "string",
                        "description": "Python source for the inner basic.code block. Inputs/constants arrive as named ports on the block. Optional — omit to build a wiring-only composer package whose logic lives entirely in nested_packages.",
                    },
                    "nested_packages": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": (
                            "Recursive: each entry is the same shape as this "
                            "tool's arguments (name, description, inputs, "
                            "outputs, constants, code, nested_packages). The "
                            "sub-package is embedded as a block.package "
                            "instance inside this one; the auto-wirer "
                            "connects its outer ports to the parent's other "
                            "inner blocks by label match. The full dependency "
                            "tree is rolled up so the runtime can resolve any "
                            "depth from one top-level node."
                        ),
                    },
                    "auto_wire": {
                        "type": "boolean",
                        "default": True,
                        "description": "Wire the new package's outer ports against existing canvas nodes by label.",
                    },
                    "wire_mode": {
                        "type": "string",
                        "enum": ["nearest", "broadcast"],
                        "default": "nearest",
                    },
                    "auto_push": {
                        "type": "boolean",
                        "default": True,
                    },
                    "api_url": {"type": "string"},
                    "source": {"type": "string", "default": "create_package_node"},
                },
            },
        ),
        Tool(
            name="update_node",
            description=(
                "Modify fields of a node already on the canvas: replace its "
                "Python code, change its execution frequency (Hz), edit "
                "parameters, or rewrite its description. Identify the target "
                "by `node_id` (exact) or `name` (case-insensitive). The full "
                "architecture is re-pushed in replace mode so the renderer "
                "and the server-side accumulator stay in sync.\n\n"
                "Port changes are not supported here — recreating a node is "
                "safer when port shape changes."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "node_id": {"type": "string"},
                    "name": {
                        "type": "string",
                        "description": "Match by node name (case-insensitive). "
                        "Use this OR node_id.",
                    },
                    "code": {"type": "string"},
                    "frequency": {
                        "type": ["string", "number"],
                        "description": "Execution rate in Hz. Stored as a string.",
                    },
                    "params": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "Replace the parameter list entirely.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Replace the aiDescription (free-form text).",
                    },
                    "api_url": {"type": "string"},
                    "source": {"type": "string", "default": "update_node"},
                },
            },
        ),
        Tool(
            name="delete_nodes",
            description=(
                "Surgically remove one or more nodes from the canvas. Hits "
                "the dedicated /api/architecture/remove-nodes endpoint, "
                "which updates the accumulator and emits a deletion event "
                "that the renderer bridge applies via editor.removeNode — "
                "no full canvas reload, so any other nodes (including ones "
                "the accumulator never saw, e.g. File → Open) stay put.\n\n"
                "Pass `node_ids` for exact removal. `names` is a convenience "
                "lookup against the accumulator (case-insensitive)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "node_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Exact node IDs to remove.",
                    },
                    "names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Node names to remove (case-insensitive).",
                    },
                    "api_url": {"type": "string"},
                    "source": {"type": "string", "default": "delete_nodes"},
                },
            },
        ),
        Tool(
            name="generate_with_backend_ai",
            description=(
                "Ask the Django backend (`/api/v1/ai/generate-architecture`) to "
                "produce an architecture from a natural-language prompt. The "
                "result already includes editor/design/dependencies and is "
                "validated server-side."
            ),
            inputSchema={
                "type": "object",
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string"},
                    "include_catalog": {"type": "boolean", "default": True},
                    "backend_url": {
                        "type": "string",
                        "description": "Override OFFBOARD_BACKEND_URL env.",
                    },
                    "auth_token": {
                        "type": "string",
                        "description": "Bearer token forwarded to Django.",
                    },
                },
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    if name == "create_node":
        spec = _node_specs_from_payload([arguments])[0]
        return _result(build_node(spec))

    if name == "create_architecture":
        specs = _node_specs_from_payload(arguments.get("nodes", []))
        if not specs:
            return _result({"error": "nodes[] is required and must be non-empty"})
        arch = build_architecture(
            specs,
            wire_mode=arguments.get("wire_mode", "nearest"),
            board=arguments.get("board", "Python3-Noetic"),
            project_name=arguments.get("project_name", "MCP Generated"),
            project_description=arguments.get("project_description", ""),
        )
        return _result(
            {
                "architecture": arch,
                "issues": validate_architecture(arch),
            }
        )

    if name == "auto_wire_existing":
        built = arguments.get("built_nodes", [])
        mode = arguments.get("mode", "nearest")
        link_models, wires = auto_wire(built, mode=mode)
        return _result({"link_models": link_models, "wires": wires})

    if name == "nest_nodes":
        inner_specs = _node_specs_from_payload(arguments.get("inner_nodes", []))
        if not inner_specs:
            return _result({"error": "inner_nodes[] is required and must be non-empty"})
        outer, inner_arch = nest_subgraph(
            inner_specs,
            package_name=arguments["package_name"],
            package_description=arguments.get("package_description", ""),
        )
        outer_built = build_node(outer)
        return _result(
            {
                "package_node": outer_built,
                "inner_architecture": inner_arch,
            }
        )

    if name == "validate_architecture":
        issues = validate_architecture(arguments.get("architecture") or {})
        return _result({"issues": issues, "valid": not issues})

    if name == "save_architecture":
        out_dir = Path(
            arguments.get("output_dir")
            or os.environ.get("OFFBOARD_MCP_OUTPUT_DIR")
            or Path.cwd()
        ).expanduser().resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = arguments["filename"]
        if not filename.endswith(".json"):
            filename += ".json"
        path = out_dir / filename
        path.write_text(
            json.dumps(arguments["architecture"], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return _result({"path": str(path)})

    if name == "gather_project_context":
        snapshot = await gather_context(
            api_url=arguments.get("api_url"),
            catalog_url=arguments.get("catalog_url"),
            backend_url=arguments.get("backend_url"),
            include_catalog=arguments.get("include_catalog", True),
            expand_catalog_groups=arguments.get("expand_catalog_groups", False),
            include_code=arguments.get("include_code", True),
        )
        return _result(snapshot)

    if name == "assist_project_request":
        prompt = arguments.get("prompt", "").strip()
        if not prompt:
            return _result({"error": "prompt is required"})
        snapshot = await gather_context(
            api_url=arguments.get("api_url"),
            backend_url=arguments.get("backend_url"),
            include_catalog=arguments.get("include_catalog", True),
            expand_catalog_groups=arguments.get("expand_catalog_groups", False),
        )

        # Build an enriched prompt the backend AI can use.
        context_blob = json.dumps(
            {
                "current_architecture": snapshot.get("current_architecture"),
                "catalog": snapshot.get("catalog"),
            },
            ensure_ascii=False,
        )[:12000]
        enriched = (
            f"{prompt}\n\nLIVE PROJECT CONTEXT (JSON):\n{context_blob}\n\n"
            "Use the live context above when designing the architecture. "
            "Prefer block types that already exist in the catalog. If the "
            "current_architecture already has nodes, decide whether to extend "
            "them or replace; describe your choice in the explanation."
        )

        backend = (
            arguments.get("backend_url")
            or os.environ.get("OFFBOARD_BACKEND_URL")
            or "http://localhost:8000"
        ).rstrip("/")
        headers = {"Content-Type": "application/json"}
        token = arguments.get("auth_token") or os.environ.get("OFFBOARD_BACKEND_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post(
                    f"{backend}/api/v1/ai/generate-architecture",
                    json={"prompt": enriched, "include_catalog": False},
                    headers=headers,
                )
            resp.raise_for_status()
            ai_response = resp.json()
        except httpx.HTTPError as exc:
            logger.exception("assist: backend AI call failed")
            return _result(
                {
                    "context": snapshot,
                    "ai_error": f"backend AI call failed: {exc}",
                    "hint": (
                        "If the Django backend is not running, fall back to "
                        "create_architecture with hand-crafted node specs."
                    ),
                }
            )

        push_result: Any = None
        if arguments.get("auto_push", True) and isinstance(ai_response, dict):
            architecture = ai_response.get("architecture")
            if isinstance(architecture, dict) and architecture:
                api_url = (
                    arguments.get("api_url")
                    or os.environ.get("OFFBOARD_API_URL")
                    or "http://localhost:3333"
                ).rstrip("/")
                try:
                    async with httpx.AsyncClient(timeout=30) as client:
                        push_resp = await client.post(
                            f"{api_url}/api/architecture/load",
                            json={
                                "architecture": architecture,
                                "source": "assist_project_request",
                            },
                            headers={"Content-Type": "application/json"},
                        )
                    push_resp.raise_for_status()
                    push_result = {"ok": True, "status": push_resp.status_code, "body": push_resp.json()}
                except httpx.HTTPError as exc:
                    logger.exception("assist: push_to_app failed")
                    push_result = {"ok": False, "error": str(exc)}

        return _result(
            {
                "context_summary": {
                    "app_running": snapshot.get("app_running"),
                    "current_architecture": snapshot.get("current_architecture"),
                    "catalog_available": (snapshot.get("catalog") or {}).get("available"),
                    "backend_ai_available": (snapshot.get("backend_ai") or {}).get("available"),
                },
                "ai_response": ai_response,
                "push_result": push_result,
            }
        )

    if name == "add_node":
        # Block kind dispatch — keep create_package_node's path for explicit
        # callers, but let add_node grow a package too via block_kind='package'.
        if (arguments.get("block_kind") or "code").lower() == "package":
            pkg_args = dict(arguments)
            pkg_args["block_kind"] = "code"  # avoid recursion if downstream re-reads
            pkg_args.setdefault("source", "add_node")
            return await call_tool("create_package_node", pkg_args)

        spec = _node_specs_from_payload([arguments])[0]
        api_url = (
            arguments.get("api_url")
            or os.environ.get("OFFBOARD_API_URL")
            or "http://localhost:3333"
        ).rstrip("/")

        # Fetch the accumulated canvas state so we can place the new node to
        # the right of existing ones and discover compatible ports to wire
        # against. `/state` is the server-side merged snapshot — `/latest`
        # only returns the most recent push and would miss earlier nodes.
        existing_node_models: dict[str, dict[str, Any]] = {}
        existing_max_x = 0.0
        canvas_status: dict[str, Any] = {"available": False}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{api_url}/api/architecture/state")
            if resp.status_code == 200:
                body = resp.json()
                arch = body.get("architecture") or {}
                layers = (arch.get("editor") or {}).get("layers") or []
                node_layer = next(
                    (L for L in layers if L.get("type") == "diagram-nodes"), None
                )
                if node_layer:
                    existing_node_models = node_layer.get("models") or {}
                    if existing_node_models:
                        existing_max_x = max(
                            float(n.get("x") or 0) for n in existing_node_models.values()
                        )
                canvas_status = {
                    "available": True,
                    "node_count": len(existing_node_models),
                }
        except httpx.HTTPError as exc:
            canvas_status = {"available": False, "error": str(exc)}

        new_x = (existing_max_x + 320) if existing_node_models else 200
        new_y = 150
        new_built = build_node(spec, x=new_x, y=new_y)

        wire_mode = arguments.get("wire_mode", "nearest")
        if arguments.get("auto_wire", True) and existing_node_models:
            link_models, wires = wire_against_existing(
                new_built, existing_node_models, mode=wire_mode
            )
        else:
            link_models, wires = {}, []

        bundle: dict[str, Any] = {
            "editor": {
                "layers": [
                    {
                        "type": "diagram-nodes",
                        "models": {new_built["node_id"]: new_built["node_model"]},
                    },
                    {"type": "diagram-links", "models": link_models},
                ],
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {"blocks": [new_built["block"]], "wires": wires},
            },
            "dependencies": {new_built["dependency_id"]: new_built["dependency"]},
        }

        push_result: Any = None
        if arguments.get("auto_push", True):
            source = arguments.get("source", "add_node")
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    push_resp = await client.post(
                        f"{api_url}/api/architecture/load",
                        json={"architecture": bundle, "source": source},
                        headers={"Content-Type": "application/json"},
                    )
                push_resp.raise_for_status()
                push_result = {
                    "ok": True,
                    "status": push_resp.status_code,
                    "body": push_resp.json(),
                }
            except httpx.HTTPError as exc:
                logger.exception("add_node: push failed")
                push_result = {"ok": False, "error": str(exc)}

        return _result(
            {
                "node": new_built,
                "wires_added": len(wires),
                "wire_targets": [
                    {
                        "to_node": w["target"]["block"]
                        if w["source"]["block"] == new_built["node_id"]
                        else w["source"]["block"],
                        "via": w["source"]["name"],
                    }
                    for w in wires
                ],
                "canvas": canvas_status,
                "push_result": push_result,
            }
        )

    if name == "push_to_app":
        architecture = arguments.get("architecture")
        if not isinstance(architecture, dict) or not architecture:
            return _result({"error": "architecture (object) is required"})
        api_url = (
            arguments.get("api_url")
            or os.environ.get("OFFBOARD_API_URL")
            or "http://localhost:3333"
        ).rstrip("/")
        source = arguments.get("source", "mcp")
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{api_url}/api/architecture/load",
                    json={"architecture": architecture, "source": source},
                    headers={"Content-Type": "application/json"},
                )
            resp.raise_for_status()
            return _result({"ok": True, "status": resp.status_code, "body": resp.json()})
        except httpx.HTTPError as exc:
            logger.exception("push_to_app failed")
            return _result(
                {
                    "error": (
                        f"could not reach NestJS API at {api_url}/api/architecture/load: "
                        f"{exc}. Is the Offboard Studio app running?"
                    ),
                }
            )

    if name == "start_new_project":
        pkg_name = (arguments.get("name") or "").strip()
        if not pkg_name:
            return _result({"error": "name is required"})
        api_url = _resolve_api_url(arguments.get("api_url"))

        # Step 1 — collect every node id currently on the canvas, then
        # surgical-remove them. Renderer applies removeNode locally on the
        # next poll cycle, so anything else (project tabs, panels) stays.
        arch = await _fetch_accumulator(api_url)
        node_ids: list[str] = []
        if isinstance(arch, dict):
            layers = (arch.get("editor") or {}).get("layers") or []
            nodes_layer = next(
                (L for L in layers if L.get("type") == "diagram-nodes"), None
            )
            if nodes_layer:
                node_ids = sorted((nodes_layer.get("models") or {}).keys())

        remove_result: dict[str, Any] = {"removed_count": 0}
        if node_ids:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        f"{api_url}/api/architecture/remove-nodes",
                        json={"node_ids": node_ids},
                        headers={"Content-Type": "application/json"},
                    )
                resp.raise_for_status()
                remove_result = resp.json()
            except httpx.HTTPError as exc:
                logger.exception("start_new_project: remove call failed")
                return _result(
                    {
                        "error": f"could not clear canvas: {exc}",
                        "requested_remove": node_ids,
                    }
                )

        # Step 2 — push fresh project settings.
        new_pkg = {
            "name": pkg_name,
            "description": str(arguments.get("description", "")),
            "author": str(arguments.get("author", "")),
            "version": str(arguments.get("version") or "0.1.0"),
            "image": str(arguments.get("image", "")),
        }
        settings_bundle = {
            "editor": {"layers": []},
            "design": {"graph": {"blocks": [], "wires": []}},
            "dependencies": {},
            "package": new_pkg,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{api_url}/api/architecture/load",
                    json={
                        "architecture": settings_bundle,
                        "source": arguments.get("source") or "start_new_project",
                    },
                    headers={"Content-Type": "application/json"},
                )
            resp.raise_for_status()
            settings_result = {
                "ok": True,
                "status": resp.status_code,
                "body": resp.json(),
            }
        except httpx.HTTPError as exc:
            logger.exception("start_new_project: settings push failed")
            settings_result = {"ok": False, "error": str(exc)}

        return _result(
            {
                "cleared_node_ids": node_ids,
                "remove_result": remove_result,
                "new_settings": new_pkg,
                "settings_result": settings_result,
            }
        )

    if name == "update_project_settings":
        api_url = _resolve_api_url(arguments.get("api_url"))
        arch = await _fetch_accumulator(api_url)
        current_pkg = {}
        if isinstance(arch, dict):
            cp = arch.get("package")
            if isinstance(cp, dict):
                current_pkg = dict(cp)

        # Merge incoming overrides on top of the accumulator's package so
        # the user can update a single field without clobbering the rest.
        new_pkg = dict(current_pkg)
        changed: list[str] = []
        for key in ("name", "description", "author", "version", "image"):
            if key in arguments and arguments[key] is not None:
                new_pkg[key] = str(arguments[key])
                changed.append(key)

        if not changed:
            return _result(
                {
                    "error": "no fields supplied — pass at least one of name/description/author/version/image",
                    "current": current_pkg,
                }
            )

        # Default the missing required fields so the renderer's loadProject
        # path doesn't crash if the accumulator's package was empty.
        new_pkg.setdefault("name", "Untitled")
        new_pkg.setdefault("version", "0.0.1")
        new_pkg.setdefault("description", "")
        new_pkg.setdefault("author", "")
        new_pkg.setdefault("image", "")

        bundle = {
            "editor": {"layers": []},
            "design": {"graph": {"blocks": [], "wires": []}},
            "dependencies": {},
            "package": new_pkg,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{api_url}/api/architecture/load",
                    json={
                        "architecture": bundle,
                        "source": arguments.get("source") or "update_project_settings",
                    },
                    headers={"Content-Type": "application/json"},
                )
            resp.raise_for_status()
            push_result = {
                "ok": True,
                "status": resp.status_code,
                "body": resp.json(),
            }
        except httpx.HTTPError as exc:
            logger.exception("update_project_settings: push failed")
            push_result = {"ok": False, "error": str(exc)}

        return _result(
            {
                "previous": current_pkg,
                "new": new_pkg,
                "changed_fields": changed,
                "push_result": push_result,
            }
        )

    if name == "create_package_node":
        pkg_name = arguments.get("name", "").strip()
        if not pkg_name:
            return _result({"error": "name is required"})
        code = arguments.get("code")
        nested = arguments.get("nested_packages") or []
        if (not isinstance(code, str) or not code.strip()) and not nested:
            return _result(
                {
                    "error": "either `code` (Python source) or `nested_packages` (at least one sub-package) is required",
                }
            )
        if isinstance(code, str) and not code.strip():
            code = None  # let builder skip the basic.code block
        api_url = _resolve_api_url(arguments.get("api_url"))

        # Position to the right of existing canvas (same as add_node).
        arch = await _fetch_accumulator(api_url)
        existing_node_models: dict[str, dict[str, Any]] = {}
        existing_max_x = 0.0
        if arch:
            layers = (arch.get("editor") or {}).get("layers") or []
            node_layer = next(
                (L for L in layers if L.get("type") == "diagram-nodes"), None
            )
            if node_layer:
                existing_node_models = node_layer.get("models") or {}
                if existing_node_models:
                    existing_max_x = max(
                        float(n.get("x") or 0) for n in existing_node_models.values()
                    )
        new_x = (existing_max_x + 320) if existing_node_models else 200
        new_y = 150

        new_built = build_package_node(
            name=pkg_name,
            description=str(arguments.get("description", "")),
            input_labels=[str(s) for s in (arguments.get("inputs") or []) if s],
            output_labels=[str(s) for s in (arguments.get("outputs") or []) if s],
            constants=list(arguments.get("constants") or []),
            code=code,
            nested_packages=list(arguments.get("nested_packages") or []),
            x=new_x,
            y=new_y,
        )

        # Auto-wire outer ports against the canvas.
        link_models, wires_list = {}, []
        if arguments.get("auto_wire", True) and existing_node_models:
            link_models, wires_list = wire_against_existing(
                new_built,
                existing_node_models,
                mode=arguments.get("wire_mode", "nearest"),
            )

        bundle = {
            "editor": {
                "layers": [
                    {
                        "type": "diagram-nodes",
                        "models": {new_built["node_id"]: new_built["node_model"]},
                    },
                    {"type": "diagram-links", "models": link_models},
                ],
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {"blocks": [new_built["block"]], "wires": wires_list},
            },
            "dependencies": {new_built["dependency_id"]: new_built["dependency"]},
        }

        push_result: Any = None
        if arguments.get("auto_push", True):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    push_resp = await client.post(
                        f"{api_url}/api/architecture/load",
                        json={
                            "architecture": bundle,
                            "source": arguments.get("source", "create_package_node"),
                        },
                        headers={"Content-Type": "application/json"},
                    )
                push_resp.raise_for_status()
                push_result = {
                    "ok": True,
                    "status": push_resp.status_code,
                    "body": push_resp.json(),
                }
            except httpx.HTTPError as exc:
                logger.exception("create_package_node: push failed")
                push_result = {"ok": False, "error": str(exc)}

        return _result(
            {
                "node": {
                    "node_id": new_built["node_id"],
                    "dependency_id": new_built["dependency_id"],
                    "name": pkg_name,
                    "kind": "block.package",
                    "outer_ports": {
                        "in": [
                            p["label"]
                            for p in new_built["node_model"]["ports"]
                            if p.get("in")
                        ],
                        "out": [
                            p["label"]
                            for p in new_built["node_model"]["ports"]
                            if not p.get("in")
                        ],
                    },
                    "inner_block_count": len(
                        new_built["dependency"]["design"]["graph"]["blocks"]
                    ),
                    "inner_wire_count": len(
                        new_built["dependency"]["design"]["graph"]["wires"]
                    ),
                },
                "wires_added": len(wires_list),
                "wire_targets": [
                    {
                        "to_node": (
                            w["target"]["block"]
                            if w["source"]["block"] == new_built["node_id"]
                            else w["source"]["block"]
                        ),
                        "via": w["source"]["name"],
                    }
                    for w in wires_list
                ],
                "push_result": push_result,
            }
        )

    if name == "update_node":
        if not arguments.get("node_id") and not arguments.get("name"):
            return _result(
                {"error": "either node_id or name is required to identify the node"}
            )
        api_url = _resolve_api_url(arguments.get("api_url"))
        arch = await _fetch_accumulator(api_url)
        if not arch:
            return _result(
                {
                    "error": (
                        "canvas state is empty or API is unreachable — "
                        "nothing to update"
                    ),
                    "api_url": api_url,
                }
            )

        match = _find_node(arch, node_id=arguments.get("node_id"), name=arguments.get("name"))
        if not match:
            return _result(
                {
                    "error": "no matching node",
                    "criteria": {
                        "node_id": arguments.get("node_id"),
                        "name": arguments.get("name"),
                    },
                }
            )
        node_id, node = match

        # Apply per-instance updates on node.data (and mirror to design.graph.block).
        data = node.setdefault("data", {})
        changed: list[str] = []
        if "code" in arguments:
            data["code"] = arguments["code"]
            changed.append("code")
        if "frequency" in arguments:
            data["frequency"] = str(arguments["frequency"])
            changed.append("frequency")
        if "params" in arguments:
            data["params"] = list(arguments["params"] or [])
            changed.append("params")
        if "description" in arguments:
            data["aiDescription"] = str(arguments["description"])
            changed.append("description")

        # Mirror to design.graph.blocks (same block id == node id).
        block_for_patch: dict[str, Any] | None = None
        for b in (arch.get("design") or {}).get("graph", {}).get("blocks", []) or []:
            if b.get("id") == node_id:
                b.setdefault("data", {})
                for key in ("code", "frequency", "params", "aiDescription"):
                    if key in data:
                        b["data"][key] = data[key]
                block_for_patch = b
                break

        # Touch the shared dependency only when this node is its sole user
        # — otherwise we'd silently mutate sibling instances.
        dep_id = (node.get("extras") or {}).get("dependency_id") or node.get("type")
        deps = arch.setdefault("dependencies", {})
        all_models = (
            next(
                (
                    L
                    for L in (arch.get("editor") or {}).get("layers", [])
                    if L.get("type") == "diagram-nodes"
                ),
                {},
            ).get("models")
            or {}
        )
        users = [
            n
            for n in all_models.values()
            if ((n.get("extras") or {}).get("dependency_id") or n.get("type")) == dep_id
        ]
        dep_touched = False
        if isinstance(dep_id, str) and dep_id in deps and len(users) == 1:
            dep = deps[dep_id]
            if isinstance(dep, dict):
                if "code" in arguments:
                    dep["code"] = arguments["code"]
                if "params" in arguments:
                    dep["parameters"] = list(arguments["params"] or [])
                if "description" in arguments:
                    dep["description"] = str(arguments["description"])[:280]
                dep_touched = True

        # Patch-append rather than full replace: only the touched node /
        # block / dep is in the bundle. Other canvas nodes (including those
        # the accumulator never saw, e.g. File → Open project) are untouched.
        dep_patch = (
            (dep_id, deps[dep_id])
            if dep_touched and isinstance(dep_id, str) and dep_id in deps
            else None
        )
        push_result = await _push_patch(
            api_url,
            node_model=node,
            block=block_for_patch,
            dependency=dep_patch,
            source=arguments.get("source") or "update_node",
        )
        return _result(
            {
                "node_id": node_id,
                "node_name": (node.get("extras") or {}).get("name"),
                "changed_fields": changed,
                "dependency_updated": dep_touched,
                "dependency_id": dep_id,
                "dependency_users": len(users),
                "push_result": push_result,
            }
        )

    if name == "delete_nodes":
        ids = set(arguments.get("node_ids") or [])
        names_arg = [
            s.strip().lower()
            for s in (arguments.get("names") or [])
            if isinstance(s, str)
        ]
        if not ids and not names_arg:
            return _result({"error": "either node_ids[] or names[] is required"})

        api_url = _resolve_api_url(arguments.get("api_url"))

        # Resolve names → ids by consulting the accumulator. Names are
        # case-insensitive matches on extras.name. node_ids are passed
        # through verbatim — the server-side remove is idempotent for
        # unknown ids, so passing an id that isn't in the accumulator
        # just no-ops (useful if the renderer has nodes the accumulator
        # never saw).
        resolved: list[dict[str, Any]] = []
        if names_arg:
            arch = await _fetch_accumulator(api_url)
            if arch:
                layers = (arch.get("editor") or {}).get("layers") or []
                nodes_layer = next(
                    (L for L in layers if L.get("type") == "diagram-nodes"), None
                )
                node_models = (nodes_layer or {}).get("models") or {}
                for nid, n in node_models.items():
                    name_lc = ((n.get("extras") or {}).get("name") or "").strip().lower()
                    if name_lc and name_lc in names_arg:
                        ids.add(nid)
                        resolved.append({"id": nid, "name": (n.get("extras") or {}).get("name")})

        if not ids:
            return _result(
                {
                    "error": "no matching nodes",
                    "criteria": arguments,
                    "hint": (
                        "If the node only exists in the renderer (loaded via "
                        "File → Open) and never went through MCP, pass its "
                        "exact node_id rather than name — the server will "
                        "propagate the removal to the bridge regardless."
                    ),
                }
            )

        # Hit the dedicated remove endpoint. The service updates its
        # accumulator AND appends to the deletion log; the bridge polls
        # /deletions and applies editor.removeNode locally — no full
        # canvas reload, so other nodes / wires stay put.
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{api_url}/api/architecture/remove-nodes",
                    json={"node_ids": sorted(ids)},
                    headers={"Content-Type": "application/json"},
                )
            resp.raise_for_status()
            api_result = resp.json()
        except httpx.HTTPError as exc:
            logger.exception("delete_nodes: remove call failed")
            return _result(
                {
                    "error": f"could not reach {api_url}/api/architecture/remove-nodes: {exc}",
                    "requested_ids": sorted(ids),
                }
            )

        return _result(
            {
                "removed_ids": sorted(ids),
                "removed_count": len(ids),
                "resolved_by_name": resolved,
                "api_result": api_result,
            }
        )

    if name == "generate_with_backend_ai":
        backend = (
            arguments.get("backend_url")
            or os.environ.get("OFFBOARD_BACKEND_URL")
            or "http://localhost:8000"
        ).rstrip("/")
        prompt = arguments.get("prompt", "").strip()
        if not prompt:
            return _result({"error": "prompt is required"})
        headers = {"Content-Type": "application/json"}
        token = arguments.get("auth_token") or os.environ.get("OFFBOARD_BACKEND_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post(
                    f"{backend}/api/v1/ai/generate-architecture",
                    json={
                        "prompt": prompt,
                        "include_catalog": arguments.get("include_catalog", True),
                    },
                    headers=headers,
                )
            resp.raise_for_status()
            return _result(resp.json())
        except httpx.HTTPError as exc:
            logger.exception("backend AI call failed")
            return _result({"error": f"backend call failed: {exc}"})

    return _result({"error": f"unknown tool: {name}"})


async def _run() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
