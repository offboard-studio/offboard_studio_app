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


def _port_label(port: dict[str, Any]) -> str:
    """Best-effort label for a serialised port (label, name, then '')."""
    return str(port.get("label") or port.get("name") or "")


def _ports_compatible(src_port: dict[str, Any], tgt_port: dict[str, Any]) -> bool:
    """Compatibility = same label (case-insensitive) AND same data_type
    (or either side is 'any'/missing). Mirrors what a human would draw."""
    if _port_label(src_port).lower() != _port_label(tgt_port).lower():
        return False
    src_t = (src_port.get("data_type") or "any").lower()
    tgt_t = (tgt_port.get("data_type") or "any").lower()
    return src_t == tgt_t or src_t == "any" or tgt_t == "any"


def _make_link(
    *,
    src_node_id: str,
    src_port: dict[str, Any],
    src_pos: tuple[float, float],
    tgt_node_id: str,
    tgt_port: dict[str, Any],
    tgt_pos: tuple[float, float],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Build one (link_model, wire) pair for the renderer + design graph."""
    link_id = str(uuid.uuid4())
    # react-diagrams expects at least two points on every link (source
    # endpoint, target endpoint). Empty arrays crash PortModel.setPosition →
    # link.getPointForPort(...) returns undefined on the first canvasReady tick.
    link_model = {
        # "default" matches CustomLinkFactory (extends DefaultLinkFactory)
        # registered in editor.ts.
        "id": link_id,
        "type": "default",
        "source": src_node_id,
        "sourcePort": src_port["id"],
        "target": tgt_node_id,
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
    wire = {
        "source": {
            "block": src_node_id,
            "port": src_port["id"],
            "name": _port_label(src_port),
        },
        "target": {
            "block": tgt_node_id,
            "port": tgt_port["id"],
            "name": _port_label(tgt_port),
        },
    }
    return link_model, wire


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
                    if not _ports_compatible(src_port, tgt_port):
                        continue
                    matches.append((tgt, tgt_port))
            if not matches:
                continue
            chosen = matches if mode == "broadcast" else matches[:1]
            for tgt, tgt_port in chosen:
                link_model, wire = _make_link(
                    src_node_id=src["node_id"],
                    src_port=src_port,
                    src_pos=(src["node_model"]["x"], src["node_model"]["y"]),
                    tgt_node_id=tgt["node_id"],
                    tgt_port=tgt_port,
                    tgt_pos=(tgt["node_model"]["x"], tgt["node_model"]["y"]),
                )
                link_models[link_model["id"]] = link_model
                wires.append(wire)
                if mode == "nearest":
                    break  # one downstream consumer per output

    return link_models, wires


def wire_against_existing(
    new_built: dict[str, Any],
    existing_node_models: dict[str, dict[str, Any]],
    *,
    mode: Literal["nearest", "broadcast"] = "nearest",
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    """Wire a freshly-built node against the nodes already on the canvas.

    For each output port on the new node, look for a matching input port on
    an existing canvas node. For each input port on the new node, look for a
    matching output port on an existing canvas node. Same label-compatibility
    rule as `auto_wire`. In "nearest" mode, each new port keeps just its
    first match; in "broadcast" mode, every match gets a link.

    Returns (link_models, wires) ready to merge into a push payload.
    """
    link_models: dict[str, dict[str, Any]] = {}
    wires: list[dict[str, Any]] = []

    new_id = new_built["node_id"]
    new_model = new_built["node_model"]
    new_pos = (new_model.get("x", 0), new_model.get("y", 0))
    new_ports = new_model.get("ports", [])
    new_in_ports = [p for p in new_ports if p.get("in")]
    new_out_ports = [p for p in new_ports if not p.get("in")]

    # New outputs → existing inputs.
    for new_port in new_out_ports:
        emitted = 0
        for ex_id, ex_model in existing_node_models.items():
            for ex_port in ex_model.get("ports", []):
                if not ex_port.get("in"):
                    continue
                if not _ports_compatible(new_port, ex_port):
                    continue
                link_model, wire = _make_link(
                    src_node_id=new_id,
                    src_port=new_port,
                    src_pos=new_pos,
                    tgt_node_id=ex_id,
                    tgt_port=ex_port,
                    tgt_pos=(ex_model.get("x", 0), ex_model.get("y", 0)),
                )
                link_models[link_model["id"]] = link_model
                wires.append(wire)
                emitted += 1
                if mode == "nearest":
                    break
            if mode == "nearest" and emitted:
                break

    # Existing outputs → new inputs.
    for new_port in new_in_ports:
        emitted = 0
        for ex_id, ex_model in existing_node_models.items():
            for ex_port in ex_model.get("ports", []):
                if ex_port.get("in"):
                    continue
                if not _ports_compatible(ex_port, new_port):
                    continue
                link_model, wire = _make_link(
                    src_node_id=ex_id,
                    src_port=ex_port,
                    src_pos=(ex_model.get("x", 0), ex_model.get("y", 0)),
                    tgt_node_id=new_id,
                    tgt_port=new_port,
                    tgt_pos=new_pos,
                )
                link_models[link_model["id"]] = link_model
                wires.append(wire)
                emitted += 1
                if mode == "nearest":
                    break
            if mode == "nearest" and emitted:
                break

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
