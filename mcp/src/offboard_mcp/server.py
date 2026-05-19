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
from offboard_mcp.core.wiring import auto_wire, validate_architecture, wire_against_existing

logger = logging.getLogger("offboard_mcp")
logging.basicConfig(level=os.environ.get("OFFBOARD_MCP_LOG", "INFO"))


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
