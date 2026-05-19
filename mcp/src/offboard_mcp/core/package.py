"""Build a `block.package` node — the rich hierarchical node that wraps a
sub-graph of `basic.input` / `basic.output` / `basic.constant` / `basic.code`
blocks behind a single canvas tile.

This is the shape Offboard Studio's UI produces when a user collapses a graph
into a package (see e.g. the PID example in `Fresh Project.json`). The runner
treats each instance as one unit; the user can double-click to descend into
the inner editor.

The structure produced here intentionally mirrors a real exported package:

    outer node             outer dep
    -----------            ---------
    type: block.package    type: block.package
    data: {}               design.graph.blocks: [basic.input × N,
    model: { layers: [        basic.constant × M,
        diagram-links,        basic.code × 1,
        diagram-nodes          basic.output × K]
    ] }                    design.graph.wires: [
    ports: [                  input → code (N edges),
        N port.input,         constant → code (M edges),
        K port.output         code → output (K edges)
    ]                      ]

Wire semantics inside a package:
    basic.input(X).input-out      → basic.code.X
    basic.constant(C).constant-out → basic.code.C
    basic.code.Y                  → basic.output(Y).output-in

Outer port.name == inner basic.input/output block id (the UI relies on this
mapping to know which inner block a dangling outer port belongs to).
"""

from __future__ import annotations

import hashlib
import uuid
from typing import Any


_INPUT_PORT_OUT = "input-out"
_CONSTANT_PORT_OUT = "constant-out"
_OUTPUT_PORT_IN = "output-in"


def _short_id(seed: str) -> str:
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()[:12]


def _block(block_id: str, block_type: str, data: dict[str, Any], x: float, y: float) -> dict[str, Any]:
    return {
        "id": block_id,
        "type": block_type,
        "position": {"x": x, "y": y},
        "data": data,
    }


def _wire(
    src_block: str,
    src_port: str,
    tgt_block: str,
    tgt_port: str,
) -> dict[str, Any]:
    return {
        "source": {"block": src_block, "port": src_port, "name": src_port},
        "target": {"block": tgt_block, "port": tgt_port, "name": tgt_port},
    }


def _inner_node_model(
    block: dict[str, Any],
    *,
    ports: list[dict[str, Any]],
    width: int = 200,
    height: int = 60,
) -> dict[str, Any]:
    """Editor-layer representation of an inner block (mirrors what the UI
    serialises). Keeps the design.graph block faithful to the runtime,
    and the editor model faithful to the canvas so double-click descend works.
    """
    pos = block["position"]
    return {
        "id": block["id"],
        "locked": False,
        "type": block["type"],
        "selected": False,
        "extras": None,
        "x": pos["x"],
        "y": pos["y"],
        "width": width,
        "height": height,
        "ports": ports,
        "data": dict(block["data"]),
    }


def _make_port(
    *,
    port_id: str,
    label: str,
    direction: str,
    parent_node_id: str,
    port_name: str | None = None,
) -> dict[str, Any]:
    """Build an editor-layer port model. `port_name` defaults to the label —
    set it to the inner block id for outer package ports so the renderer can
    map outer ports onto inner basic.input/output blocks."""
    return {
        "id": port_id,
        "locked": False,
        "type": "port.input" if direction == "in" else "port.output",
        "extras": None,
        "x": 0,
        "y": 0,
        "name": port_name if port_name is not None else label,
        "alignment": "left" if direction == "in" else "right",
        "parentNode": parent_node_id,
        "links": [],
        "in": direction == "in",
        "label": label,
        "hideLabel": False,
    }


def build_package_node(
    *,
    name: str,
    description: str = "",
    input_labels: list[str],
    output_labels: list[str],
    constants: list[dict[str, Any]] | None = None,
    code: str,
    x: float = 0,
    y: float = 0,
    dependency_id: str | None = None,
) -> dict[str, Any]:
    """Materialise a `block.package` node fragment for push_to_app / merge.

    Returns the same shape `build_node` does so callers can use it
    interchangeably:
        {
          "node_id": "...",
          "dependency_id": "...",
          "node_model": {...},
          "block": {...},          # top-level design.graph entry
          "dependency": {...},     # nested package dep
        }
    """
    constants = constants or []
    node_id = str(uuid.uuid4())
    dep_id = dependency_id or f"block.package.{_short_id(name)}"

    # --- inner blocks ---
    col_x = {"input": 250, "constant": 600, "code": 950, "output": 1300}
    row_step = 140

    input_blocks: list[dict[str, Any]] = []
    for i, label in enumerate(input_labels):
        bid = str(uuid.uuid4())
        input_blocks.append(
            _block(bid, "basic.input", {"name": label}, col_x["input"], 200 + i * row_step)
        )

    constant_blocks: list[dict[str, Any]] = []
    for i, c in enumerate(constants):
        bid = str(uuid.uuid4())
        constant_blocks.append(
            _block(
                bid,
                "basic.constant",
                {
                    "name": str(c.get("name", f"c_{i}")),
                    "value": str(c.get("value", "")),
                    "local": bool(c.get("local", True)),
                },
                col_x["constant"],
                100 + i * row_step,
            )
        )

    output_blocks: list[dict[str, Any]] = []
    for i, label in enumerate(output_labels):
        bid = str(uuid.uuid4())
        output_blocks.append(
            _block(bid, "basic.output", {"name": label}, col_x["output"], 250 + i * row_step)
        )

    code_block_id = str(uuid.uuid4())
    code_in_ports = [{"name": lbl} for lbl in input_labels] + [
        {"name": str(c.get("name", f"c_{i}"))} for i, c in enumerate(constants)
    ]
    code_out_ports = [{"name": lbl} for lbl in output_labels]
    code_block = _block(
        code_block_id,
        "basic.code",
        {
            "name": name,
            "code": code,
            "ports": {"in": code_in_ports, "out": code_out_ports},
            "params": [],
            "frequency": "1",
            "aiDescription": description,
        },
        col_x["code"],
        200,
    )

    # --- inner wires (semantic) ---
    inner_wires: list[dict[str, Any]] = []
    for ib, label in zip(input_blocks, input_labels):
        inner_wires.append(_wire(ib["id"], _INPUT_PORT_OUT, code_block_id, label))
    for cb, c in zip(constant_blocks, constants):
        cname = str(c.get("name", "c"))
        inner_wires.append(_wire(cb["id"], _CONSTANT_PORT_OUT, code_block_id, cname))
    for ob, label in zip(output_blocks, output_labels):
        inner_wires.append(_wire(code_block_id, label, ob["id"], _OUTPUT_PORT_IN))

    # --- inner editor node models (for the double-click sub-editor view) ---
    # Track port ids per (block_id, port_label) so we can wire them up
    # below — react-diagrams link models reference ports by id, not name.
    port_ids: dict[tuple[str, str], str] = {}
    inner_node_models: dict[str, dict[str, Any]] = {}

    def _register_port(block_id: str, label: str, direction: str) -> dict[str, Any]:
        pid = str(uuid.uuid4())
        port_ids[(block_id, label)] = pid
        return _make_port(
            port_id=pid, label=label, direction=direction, parent_node_id=block_id
        )

    for ib in input_blocks:
        ports = [_register_port(ib["id"], _INPUT_PORT_OUT, "out")]
        inner_node_models[ib["id"]] = _inner_node_model(ib, ports=ports)
    for cb in constant_blocks:
        ports = [_register_port(cb["id"], _CONSTANT_PORT_OUT, "out")]
        inner_node_models[cb["id"]] = _inner_node_model(cb, ports=ports)
    for ob in output_blocks:
        ports = [_register_port(ob["id"], _OUTPUT_PORT_IN, "in")]
        inner_node_models[ob["id"]] = _inner_node_model(ob, ports=ports)

    code_inner_ports = []
    for p in code_in_ports:
        code_inner_ports.append(_register_port(code_block_id, p["name"], "in"))
    for p in code_out_ports:
        code_inner_ports.append(_register_port(code_block_id, p["name"], "out"))
    inner_node_models[code_block_id] = _inner_node_model(
        code_block, ports=code_inner_ports, width=300, height=200
    )

    # --- inner link models (the visual wires react-diagrams renders) ---
    # Mirror the semantic `inner_wires` list, but with port-id references and
    # endpoint points so PortModel.setPosition has something to chew on.
    inner_link_models: dict[str, dict[str, Any]] = {}

    def _add_link(
        src_block_id: str,
        src_port_label: str,
        tgt_block_id: str,
        tgt_port_label: str,
    ) -> None:
        src_port_id = port_ids.get((src_block_id, src_port_label))
        tgt_port_id = port_ids.get((tgt_block_id, tgt_port_label))
        if not src_port_id or not tgt_port_id:
            return
        src_pos = next(
            b["position"]
            for b in inner_blocks_all_tmp
            if b["id"] == src_block_id
        )
        tgt_pos = next(
            b["position"]
            for b in inner_blocks_all_tmp
            if b["id"] == tgt_block_id
        )
        link_id = str(uuid.uuid4())
        inner_link_models[link_id] = {
            "id": link_id,
            "type": "default",
            "source": src_block_id,
            "sourcePort": src_port_id,
            "target": tgt_block_id,
            "targetPort": tgt_port_id,
            "points": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "point",
                    "x": src_pos["x"],
                    "y": src_pos["y"],
                    "selected": False,
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "point",
                    "x": tgt_pos["x"],
                    "y": tgt_pos["y"],
                    "selected": False,
                },
            ],
            "labels": [],
            "width": 1,
            "color": "rgba(255,255,255,0.5)",
            "curvyness": 50,
            "selectedColor": "rgb(0,192,255)",
        }

    inner_blocks_all = input_blocks + constant_blocks + [code_block] + output_blocks
    inner_blocks_all_tmp = inner_blocks_all  # _add_link closes over this name
    for ib, label in zip(input_blocks, input_labels):
        _add_link(ib["id"], _INPUT_PORT_OUT, code_block_id, label)
    for cb, c in zip(constant_blocks, constants):
        cname = str(c.get("name", "c"))
        _add_link(cb["id"], _CONSTANT_PORT_OUT, code_block_id, cname)
    for ob, label in zip(output_blocks, output_labels):
        _add_link(code_block_id, label, ob["id"], _OUTPUT_PORT_IN)

    inner_editor = {
        "id": str(uuid.uuid4()),
        "locked": False,
        "zoom": 100,
        "offsetX": 0,
        "offsetY": 0,
        "gridSize": 20,
        "layers": [
            {
                "id": str(uuid.uuid4()),
                "locked": None,
                "type": "diagram-links",
                "extras": None,
                "isSvg": True,
                "transformed": True,
                "models": inner_link_models,
            },
            {
                "id": str(uuid.uuid4()),
                "locked": None,
                "type": "diagram-nodes",
                "extras": None,
                "isSvg": False,
                "transformed": True,
                "models": inner_node_models,
            },
        ],
    }

    # --- outer node ---
    outer_ports: list[dict[str, Any]] = []
    for ib, label in zip(input_blocks, input_labels):
        outer_ports.append(
            _make_port(
                port_id=str(uuid.uuid4()),
                label=label,
                direction="in",
                parent_node_id=node_id,
                port_name=ib["id"],  # ⚠ outer port.name == inner basic.input id
            )
        )
    for ob, label in zip(output_blocks, output_labels):
        outer_ports.append(
            _make_port(
                port_id=str(uuid.uuid4()),
                label=label,
                direction="out",
                parent_node_id=node_id,
                port_name=ob["id"],  # ⚠ outer port.name == inner basic.output id
            )
        )

    # --- inner design (also embedded on the outer node so the renderer's
    # PackageBlockModel can read design.graph.blocks at deserialize time) ---
    inner_design = {
        "board": "Python3-Noetic",
        "graph": {"blocks": inner_blocks_all, "wires": inner_wires},
    }
    project_info = {
        "name": name,
        "description": description,
        "version": "0.0.1",
        "author": "",
        "image": "",
    }

    outer_node_model = {
        "id": node_id,
        "locked": False,
        "type": "block.package",
        "selected": False,
        "extras": {"name": name, "dependency_id": dep_id},
        "x": x,
        "y": y,
        # PackageBlockModel.deserialize reads these top-level fields directly:
        #   data, model, info, design, dependencies
        # so they must live on the node, not just inside the dependency entry.
        "data": {"name": name},
        "model": inner_editor,
        "info": project_info,
        "design": inner_design,
        "dependencies": {},
        "ports": outer_ports,
    }

    # --- outer dep (the runtime / save format) ---
    dependency = {
        "package": project_info,
        "design": inner_design,
        "dependencies": {},
    }

    outer_block = {
        "id": node_id,
        "type": "block.package",
        "position": {"x": x, "y": y},
        "data": {},
    }

    return {
        "node_id": node_id,
        "dependency_id": dep_id,
        "node_model": outer_node_model,
        "block": outer_block,
        "dependency": dependency,
    }
