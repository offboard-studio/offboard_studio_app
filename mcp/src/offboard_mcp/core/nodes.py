"""Node primitives for Offboard Studio architectures.

A "node" here means one component in the visual editor — what the user sees
as a single block on the canvas. Every node has a stable dependency id
(shared by all instances of the same component type), a unique node id (one
per placement on the canvas), and a list of ports.

This module deliberately stays JSON-only: it never touches HTTP, files, or
the LLM. That makes it cheap to call from MCP tools and easy to test.
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

DEFAULT_CODE = (
    "def main(inputs, outputs, parameters, synchronise):\n"
    "    # TODO: implement\n"
    "    pass\n"
)


@dataclass
class PortSpec:
    """One input or output port on a node."""

    label: str
    direction: Literal["in", "out"]
    port_type: str = "any"

    def to_model(self) -> dict[str, Any]:
        return {
            "id": str(uuid.uuid4()),
            "type": "diagram-default",
            "label": self.label,
            "name": self.label,
            "in": self.direction == "in",
            "data_type": self.port_type,
        }


@dataclass
class NodeSpec:
    """User-level description of a node.

    Auto-wiring matches `outputs` of one NodeSpec against `inputs` of another
    using their `label` (case-insensitive), so pick labels that mean the same
    thing on both sides of a connection (e.g. "Image").
    """

    name: str
    description: str = ""
    inputs: list[PortSpec] = field(default_factory=list)
    outputs: list[PortSpec] = field(default_factory=list)
    parameters: list[dict[str, Any]] = field(default_factory=list)
    code: str = DEFAULT_CODE
    dependency_id: str | None = None
    block_type: str = "basic.code"

    def resolved_dependency_id(self) -> str:
        if self.dependency_id:
            return self.dependency_id
        digest = hashlib.sha1(self.name.encode("utf-8")).hexdigest()[:12]
        return f"basic.code.{digest}"


def build_node(spec: NodeSpec, *, x: float = 0, y: float = 0) -> dict[str, Any]:
    """Materialise a NodeSpec into the renderer's editor/design/dep triplet fragment.

    Returns a dict shaped as:
        {
          "node_id": "...",
          "dependency_id": "...",
          "node_model": {...},   # editor.layers["diagram-nodes"].models[node_id]
          "block": {...},        # design.graph.blocks entry
          "dependency": {...},   # dependencies[dependency_id]
        }
    """
    node_id = str(uuid.uuid4())
    dep_id = spec.resolved_dependency_id()
    in_ports = [p.to_model() for p in spec.inputs if p.direction == "in"]
    out_ports = [p.to_model() for p in spec.outputs if p.direction == "out"]

    node_model = {
        "id": node_id,
        "type": dep_id,
        "x": x,
        "y": y,
        "ports": in_ports + out_ports,
        "selected": False,
        "extras": {"name": spec.name},
    }
    block = {
        "id": node_id,
        "type": dep_id,
        "position": {"x": x, "y": y},
        "data": {"name": spec.name},
    }
    dependency = {
        "type": spec.block_type,
        "description": spec.description[:280],
        "inputs": [p.label for p in spec.inputs],
        "outputs": [p.label for p in spec.outputs],
        "parameters": spec.parameters,
        "code": spec.code,
    }
    return {
        "node_id": node_id,
        "dependency_id": dep_id,
        "node_model": node_model,
        "block": block,
        "dependency": dependency,
    }


def grid_layout(count: int, *, columns: int = 4, col_gap: int = 260, row_gap: int = 160,
                origin_x: int = 200, origin_y: int = 150) -> list[tuple[float, float]]:
    """Compute (x, y) positions for `count` nodes in a left-to-right grid."""
    return [
        (origin_x + (i % columns) * col_gap, origin_y + (i // columns) * row_gap)
        for i in range(count)
    ]
