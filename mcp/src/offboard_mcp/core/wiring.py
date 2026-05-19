"""Auto-wiring: connect output ports to compatible input ports.

Strategy (port-label compatibility):
    1. Walk built nodes left-to-right (creation order).
    2. For each output port of node N, scan downstream nodes for an input
       port with the same label (case-insensitive).
    3. Connect to the first match, then move to the next output. This avoids
       fan-out fights and keeps the graph readable.

Optionally, `mode="broadcast"` lets one output feed *every* matching
downstream input, which is closer to what `ollama10.deneme.py` did under
its "maximum connections" preset.
"""

from __future__ import annotations

import uuid
from typing import Any, Literal


def auto_wire(
    built_nodes: list[dict[str, Any]],
    *,
    mode: Literal["nearest", "broadcast"] = "nearest",
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    """Connect outputs to inputs and return (link_models, wires).

    `built_nodes` is a list of objects returned by `build_node()`.
    """
    link_models: dict[str, dict[str, Any]] = {}
    wires: list[dict[str, Any]] = []

    for src_idx, src in enumerate(built_nodes):
        src_out_ports = [p for p in src["node_model"]["ports"] if not p["in"]]
        for src_port in src_out_ports:
            matches = []
            for tgt in built_nodes[src_idx + 1 :]:
                for tgt_port in tgt["node_model"]["ports"]:
                    if not tgt_port["in"]:
                        continue
                    if tgt_port["label"].lower() != src_port["label"].lower():
                        continue
                    matches.append((tgt, tgt_port))
            if not matches:
                continue
            chosen = matches if mode == "broadcast" else matches[:1]
            for tgt, tgt_port in chosen:
                link_id = str(uuid.uuid4())
                # react-diagrams expects at least two points on every link
                # (source endpoint, target endpoint). Empty arrays crash
                # PortModel.setPosition → link.getPointForPort(...) returns
                # undefined on the first canvasReady tick.
                src_pos = (src["node_model"]["x"], src["node_model"]["y"])
                tgt_pos = (tgt["node_model"]["x"], tgt["node_model"]["y"])
                link_models[link_id] = {
                    # "default" matches CustomLinkFactory (extends
                    # DefaultLinkFactory) registered in editor.ts.
                    "id": link_id,
                    "type": "default",
                    "source": src["node_id"],
                    "sourcePort": src_port["id"],
                    "target": tgt["node_id"],
                    "targetPort": tgt_port["id"],
                    "points": [
                        {
                            "id": str(uuid.uuid4()),
                            "type": "point",
                            "x": src_pos[0],
                            "y": src_pos[1],
                            "selected": False,
                        },
                        {
                            "id": str(uuid.uuid4()),
                            "type": "point",
                            "x": tgt_pos[0],
                            "y": tgt_pos[1],
                            "selected": False,
                        },
                    ],
                    "labels": [],
                    "width": 1,
                    "color": "rgba(255,255,255,0.5)",
                    "curvyness": 50,
                    "selectedColor": "rgb(0,192,255)",
                }
                wires.append(
                    {
                        "source": {
                            "block": src["node_id"],
                            "port": src_port["id"],
                            "name": src_port["label"],
                        },
                        "target": {
                            "block": tgt["node_id"],
                            "port": tgt_port["id"],
                            "name": tgt_port["label"],
                        },
                    }
                )
                if mode == "nearest":
                    break  # one downstream consumer per output

    return link_models, wires


def validate_architecture(architecture: dict[str, Any]) -> list[str]:
    """Cheap structural checks. Returns a list of problem descriptions (empty == ok)."""
    issues: list[str] = []

    try:
        layers = architecture["editor"]["layers"]
        link_models = next(
            (l for l in layers if l.get("type") == "diagram-links"), {}
        ).get("models", {})
        node_models = next(
            (l for l in layers if l.get("type") == "diagram-nodes"), {}
        ).get("models", {})
    except (KeyError, TypeError):
        return ["architecture is missing editor.layers"]

    node_ids = set(node_models.keys())
    port_ids: set[str] = set()
    for n in node_models.values():
        for p in n.get("ports", []):
            port_ids.add(p["id"])

    for link in link_models.values():
        if link.get("source") not in node_ids:
            issues.append(f"link {link.get('id')} references unknown source node")
        if link.get("target") not in node_ids:
            issues.append(f"link {link.get('id')} references unknown target node")
        if link.get("sourcePort") not in port_ids:
            issues.append(f"link {link.get('id')} references unknown source port")
        if link.get("targetPort") not in port_ids:
            issues.append(f"link {link.get('id')} references unknown target port")

    deps = architecture.get("dependencies", {})
    for n in node_models.values():
        if n.get("type") and n["type"] not in deps:
            issues.append(
                f"node {n.get('id')} uses dependency '{n['type']}' that is not declared"
            )

    return issues
