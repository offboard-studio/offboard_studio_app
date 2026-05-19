"""Project-state context collector.

Walks the live services around the Offboard Studio desktop app and returns a
compact snapshot the LLM can use as conditioning. Each source is best-effort
— if a sidecar is down we degrade gracefully and report `available: False`
for that section instead of erroring.

Sources:
  * NestJS API     (`http://localhost:3333/api`)        — the in-app API
    - `/api/architecture/latest` : whatever was last pushed in
    - `/api/singleton-data`      : misc app state (aiBuildSync, etc.)
    - `/api/health`              : sanity ping
  * Components store (`http://localhost:3000/api`)      — block catalog
    - `/api/blocks/categories`
    - `/api/blocks/{group}` for each category group
  * Django backend  (`http://localhost:8000`)           — optional, only its
    `/api/v1/ai/providers` for which LLMs the backend can reach.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def _get_json(client: httpx.AsyncClient, url: str) -> Any:
    try:
        resp = await client.get(url, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.info("context fetch failed %s: %s", url, exc)
        return None


def _summarise_architecture(
    state: Any, *, include_code: bool = True
) -> dict[str, Any]:
    """Summarise the canvas snapshot returned by `/api/architecture/state`.

    Falls back to the older `/api/architecture/latest` shape (which wraps the
    bundle under `payload`) so this is safe against either endpoint.

    When `include_code` is True the per-node and per-dependency code is
    surfaced in full (not truncated). The accumulator usually has a handful
    of small basic.code blocks, so the cost is modest. Set False from a
    caller that only needs metadata (port shapes, names, IDs).
    """
    if not isinstance(state, dict):
        return {"available": False}
    # `/state` shape: {receivedAt, architecture}
    # `/latest` shape: {source, receivedAt, payload: {architecture?, ...}}
    if "architecture" in state and "payload" not in state:
        bundle = state.get("architecture") if isinstance(state.get("architecture"), dict) else None
        source = None
    else:
        payload = state.get("payload") or {}
        arch = payload.get("architecture") if isinstance(payload, dict) else None
        bundle = arch if isinstance(arch, dict) else payload
        source = state.get("source")
    if not isinstance(bundle, dict):
        return {"available": False, "raw": state}

    layers = (bundle.get("editor") or {}).get("layers") or []
    nodes_layer = next((l for l in layers if l.get("type") == "diagram-nodes"), {})
    links_layer = next((l for l in layers if l.get("type") == "diagram-links"), {})
    node_models = nodes_layer.get("models") or {}
    link_models = links_layer.get("models") or {}
    deps = bundle.get("dependencies") or {}

    node_summaries = []
    for node in node_models.values():
        ports = node.get("ports", []) or []
        data = node.get("data") or {}
        entry: dict[str, Any] = {
            "id": node.get("id"),
            "type": node.get("type"),
            "dependency_id": (node.get("extras") or {}).get("dependency_id"),
            "name": (node.get("extras") or {}).get("name"),
            "inputs": [p["label"] for p in ports if p.get("in")],
            "outputs": [p["label"] for p in ports if not p.get("in")],
            "position": {"x": node.get("x"), "y": node.get("y")},
            "frequency": data.get("frequency"),
            "params": data.get("params") or [],
        }
        if include_code:
            # Prefer the node's own data.code (per-instance), fall back to
            # the shared dependency's code so we always show *something*.
            code = data.get("code")
            if not code:
                dep = deps.get(entry["dependency_id"]) or {}
                if isinstance(dep, dict):
                    code = dep.get("code")
            entry["code"] = code or ""
        node_summaries.append(entry)

    dep_summaries = []
    for dep_id, dep in deps.items():
        if not isinstance(dep, dict):
            continue
        # Two dep shapes coexist:
        #   1. flat   {type, description, inputs, outputs, parameters, code}
        #      — what MCP's create_node / add_node emit (a single basic.code).
        #   2. nested {package, design.graph.{blocks, wires}, dependencies}
        #      — what the UI emits for block.package nodes (e.g. PID).
        is_package = "design" in dep and isinstance(dep.get("design"), dict)
        if is_package:
            pkg = dep.get("package") or {}
            graph = (dep.get("design") or {}).get("graph") or {}
            inner_blocks = graph.get("blocks") or []
            inner_wires = graph.get("wires") or []
            entry: dict[str, Any] = {
                "id": dep_id,
                "kind": "package",
                "name": pkg.get("name"),
                "description": pkg.get("description"),
                "inner_block_count": len(inner_blocks),
                "inner_wire_count": len(inner_wires),
                "sub_deps": list((dep.get("dependencies") or {}).keys()),
            }
            # Type histogram for a quick read.
            type_counts: dict[str, int] = {}
            for b in inner_blocks:
                t = str(b.get("type") or "?")
                type_counts[t] = type_counts.get(t, 0) + 1
            entry["inner_block_types"] = type_counts
            # Per-block summary — names + (optionally) code.
            entry["inner_blocks"] = []
            for b in inner_blocks:
                b_data = b.get("data") or {}
                b_entry = {
                    "id": b.get("id"),
                    "type": b.get("type"),
                    "name": b_data.get("name"),
                }
                if b.get("type") == "basic.constant":
                    b_entry["value"] = b_data.get("value")
                if include_code and b.get("type") == "basic.code":
                    b_entry["code"] = b_data.get("code") or ""
                entry["inner_blocks"].append(b_entry)
            entry["inner_wires"] = inner_wires
        else:
            entry = {
                "id": dep_id,
                "kind": "code",
                "type": dep.get("type"),
                "description": dep.get("description"),
                "inputs": dep.get("inputs", []),
                "outputs": dep.get("outputs", []),
                "parameters": dep.get("parameters", []),
            }
            if include_code:
                entry["code"] = dep.get("code") or ""
        dep_summaries.append(entry)

    return {
        "available": True,
        "source": source,
        "receivedAt": state.get("receivedAt"),
        "node_count": len(node_models),
        "link_count": len(link_models),
        "dependency_count": len(deps),
        "nodes": node_summaries,
        "dependencies": dep_summaries,
    }


async def _gather_catalog(
    client: httpx.AsyncClient, base_url: str, expand_groups: bool
) -> dict[str, Any]:
    categories = await _get_json(client, f"{base_url}/api/blocks/categories")
    if not isinstance(categories, list):
        return {"available": False}
    out: dict[str, Any] = {"available": True, "categories": categories, "groups": {}}
    if not expand_groups:
        return out

    # Categories format is usually [{group, label, ...}] — fan out.
    group_keys: list[str] = []
    for entry in categories:
        if isinstance(entry, dict):
            key = entry.get("group") or entry.get("id") or entry.get("name")
            if key:
                group_keys.append(str(key))
        elif isinstance(entry, str):
            group_keys.append(entry)

    fetched = await asyncio.gather(
        *[_get_json(client, f"{base_url}/api/blocks/{key}") for key in group_keys],
        return_exceptions=False,
    )
    for key, data in zip(group_keys, fetched):
        if data is not None:
            out["groups"][key] = data
    return out


async def gather(
    *,
    api_url: str | None = None,
    catalog_url: str | None = None,
    backend_url: str | None = None,
    include_catalog: bool = True,
    expand_catalog_groups: bool = False,
    include_code: bool = True,
) -> dict[str, Any]:
    """Collect the live snapshot. Each missing endpoint produces a
    `{"available": False, ...}` slot instead of failing the whole call.

    Reads `/api/architecture/state` (the accumulated snapshot) so callers
    see the full canvas, not just the most recent push. Falls back to
    `/api/architecture/latest` if `state` is unavailable (older API builds).
    """

    api = (api_url or os.environ.get("OFFBOARD_API_URL") or "http://localhost:3333").rstrip("/")
    catalog = (
        catalog_url
        or os.environ.get("OFFBOARD_CATALOG_URL")
        or "http://localhost:3000"
    ).rstrip("/")
    backend = (backend_url or os.environ.get("OFFBOARD_BACKEND_URL") or "http://localhost:8000").rstrip("/")

    snapshot: dict[str, Any] = {
        "endpoints": {"api": api, "catalog": catalog, "backend": backend},
    }

    async with httpx.AsyncClient() as client:
        api_health = await _get_json(client, f"{api}/api/health")
        snapshot["app_running"] = api_health is not None
        snapshot["api_health"] = api_health

        state = await _get_json(client, f"{api}/api/architecture/state")
        if state and (state.get("architecture") is not None):
            snapshot["current_architecture"] = _summarise_architecture(
                state, include_code=include_code
            )
        else:
            # Older API builds, or accumulator empty — fall back to /latest.
            latest = await _get_json(client, f"{api}/api/architecture/latest")
            snapshot["current_architecture"] = _summarise_architecture(
                latest, include_code=include_code
            )

        singleton = await _get_json(client, f"{api}/api/singleton-data")
        snapshot["singleton_data"] = singleton

        if include_catalog:
            snapshot["catalog"] = await _gather_catalog(
                client, catalog, expand_groups=expand_catalog_groups
            )
        else:
            snapshot["catalog"] = {"available": None, "skipped": True}

        providers = await _get_json(client, f"{backend}/api/v1/ai/providers")
        snapshot["backend_ai"] = {
            "available": providers is not None,
            "providers": providers,
        }

    return snapshot


def gather_sync(**kwargs: Any) -> dict[str, Any]:
    """Convenience wrapper for callers that aren't already async."""
    return asyncio.run(gather(**kwargs))
