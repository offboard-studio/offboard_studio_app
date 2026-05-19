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


def _summarise_architecture(latest: Any) -> dict[str, Any]:
    if not isinstance(latest, dict):
        return {"available": False}
    payload = latest.get("payload") or {}
    arch = payload.get("architecture") if isinstance(payload, dict) else None
    bundle = arch if isinstance(arch, dict) else payload
    if not isinstance(bundle, dict):
        return {"available": False, "raw": latest}

    layers = (bundle.get("editor") or {}).get("layers") or []
    nodes_layer = next((l for l in layers if l.get("type") == "diagram-nodes"), {})
    links_layer = next((l for l in layers if l.get("type") == "diagram-links"), {})
    node_models = nodes_layer.get("models") or {}
    link_models = links_layer.get("models") or {}
    deps = bundle.get("dependencies") or {}

    node_summaries = []
    for node in node_models.values():
        ports = node.get("ports", []) or []
        node_summaries.append(
            {
                "id": node.get("id"),
                "type": node.get("type"),
                "name": (node.get("extras") or {}).get("name"),
                "inputs": [p["label"] for p in ports if p.get("in")],
                "outputs": [p["label"] for p in ports if not p.get("in")],
                "position": {"x": node.get("x"), "y": node.get("y")},
            }
        )

    return {
        "available": True,
        "source": latest.get("source"),
        "receivedAt": latest.get("receivedAt"),
        "node_count": len(node_models),
        "link_count": len(link_models),
        "dependency_count": len(deps),
        "nodes": node_summaries,
        "dependencies": [
            {
                "id": dep_id,
                "type": (dep or {}).get("type"),
                "inputs": (dep or {}).get("inputs", []),
                "outputs": (dep or {}).get("outputs", []),
                "code_preview": ((dep or {}).get("code") or "")[:240],
            }
            for dep_id, dep in deps.items()
        ],
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
) -> dict[str, Any]:
    """Collect the live snapshot. Each missing endpoint produces a
    `{"available": False, ...}` slot instead of failing the whole call."""

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

        latest = await _get_json(client, f"{api}/api/architecture/latest")
        snapshot["current_architecture"] = _summarise_architecture(latest)

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
