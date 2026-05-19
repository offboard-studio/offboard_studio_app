"""Node-in-node: package a sub-architecture as a single reusable node.

Offboard Studio's "Package" feature lets a user collapse a graph into one
block whose external ports map onto the inner graph's free ports. This
module produces such a packaged dependency programmatically so MCP tools
can build hierarchical libraries without going through the UI.
"""

from __future__ import annotations

import hashlib
import uuid
from typing import Any

from offboard_mcp.core.nodes import NodeSpec, PortSpec
from offboard_mcp.core.architecture import build_architecture


def _free_ports(architecture: dict[str, Any]) -> tuple[list[PortSpec], list[PortSpec]]:
    """Find ports inside `architecture` that aren't yet wired up. Those become
    the external ports of the packaged node."""
    layers = architecture["editor"]["layers"]
    node_models = next(l for l in layers if l["type"] == "diagram-nodes")["models"]
    link_models = next(l for l in layers if l["type"] == "diagram-links")["models"]

    wired: set[str] = set()
    for link in link_models.values():
        wired.add(link["sourcePort"])
        wired.add(link["targetPort"])

    free_in: list[PortSpec] = []
    free_out: list[PortSpec] = []
    for node in node_models.values():
        for port in node["ports"]:
            if port["id"] in wired:
                continue
            spec = PortSpec(
                label=port["label"],
                direction="in" if port["in"] else "out",
                port_type=port.get("data_type", "any"),
            )
            (free_in if port["in"] else free_out).append(spec)

    return free_in, free_out


def nest_subgraph(
    inner_nodes: list[NodeSpec],
    *,
    package_name: str,
    package_description: str = "",
) -> tuple[NodeSpec, dict[str, Any]]:
    """Build an architecture from `inner_nodes` and wrap it as ONE outer NodeSpec.

    Returns (outer_node_spec, inner_architecture). The renderer can either:
      - drop the outer spec into a parent architecture (then user double-clicks
        to descend into it), or
      - keep the inner_architecture around so the runtime knows what the
        package expands to.
    """
    inner = build_architecture(
        inner_nodes,
        project_name=package_name,
        project_description=package_description,
    )
    free_in, free_out = _free_ports(inner)

    pkg_digest = hashlib.sha1(package_name.encode("utf-8")).hexdigest()[:12]
    pkg_dep_id = f"basic.package.{pkg_digest}"

    # Glue code that defers to the inner package at runtime. The runtime is
    # expected to resolve `package=...` against its package registry.
    pkg_code = (
        "def main(inputs, outputs, parameters, synchronise, package=None):\n"
        f"    # delegate to '{package_name}'\n"
        "    return package.run(inputs, outputs, parameters, synchronise)\n"
    )

    outer = NodeSpec(
        name=package_name,
        description=package_description or f"Nested package: {package_name}",
        inputs=free_in,
        outputs=free_out,
        code=pkg_code,
        dependency_id=pkg_dep_id,
        block_type="basic.package",
    )
    return outer, inner
