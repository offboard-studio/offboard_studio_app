"""Offboard Studio MCP server — exposes node/architecture primitives over MCP."""

from offboard_mcp.core.nodes import NodeSpec, PortSpec, build_node
from offboard_mcp.core.wiring import auto_wire
from offboard_mcp.core.nested import nest_subgraph
from offboard_mcp.core.architecture import build_architecture

__all__ = [
    "NodeSpec",
    "PortSpec",
    "build_node",
    "auto_wire",
    "nest_subgraph",
    "build_architecture",
]
