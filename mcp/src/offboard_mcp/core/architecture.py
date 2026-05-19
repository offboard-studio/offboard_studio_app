"""Glue: take NodeSpec list → full architecture JSON the renderer can load."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from offboard_mcp.core.nodes import NodeSpec, build_node, grid_layout
from offboard_mcp.core.wiring import auto_wire


def build_architecture(
    nodes: list[NodeSpec],
    *,
    board: str = "Python3-Noetic",
    wire_mode: Literal["nearest", "broadcast"] = "nearest",
    project_name: str = "MCP Generated",
    project_description: str = "",
) -> dict[str, Any]:
    """Materialise NodeSpec[] into an editor + design + dependencies bundle.

    The shape matches what `Editor.loadProject` on the renderer expects.
    """
    positions = grid_layout(len(nodes))
    built = [build_node(n, x=x, y=y) for n, (x, y) in zip(nodes, positions)]

    node_models = {b["node_id"]: b["node_model"] for b in built}
    blocks = [b["block"] for b in built]
    dependencies: dict[str, dict[str, Any]] = {}
    for b in built:
        dependencies[b["dependency_id"]] = b["dependency"]

    link_models, wires = auto_wire(built, mode=wire_mode)

    return {
        "version": "3.0",
        "editor": {
            "id": str(uuid.uuid4()),
            "zoom": 100,
            "offsetX": 0,
            "offsetY": 0,
            "layers": [
                {"type": "diagram-links", "models": link_models},
                {"type": "diagram-nodes", "models": node_models},
            ],
        },
        "design": {
            "board": board,
            "graph": {"blocks": blocks, "wires": wires},
        },
        "dependencies": dependencies,
        "package": {
            "name": project_name,
            "version": "0.0.1",
            "description": project_description,
            "author": "",
            "image": "",
        },
    }
