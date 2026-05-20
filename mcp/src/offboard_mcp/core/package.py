"""Build a `block.package` node — the rich hierarchical node that wraps a
sub-graph of `basic.input` / `basic.output` / `basic.constant` / `basic.code`
blocks AND, optionally, other `block.package` instances behind a single canvas tile.

Recursion is supported: a package may contain nested packages (which in turn
may contain their own nested packages). The dependency map on the outer
package accumulates every sub-package's dependency entry, so the runtime can
resolve the full tree from a single top-level node.

Internal wire convention (preserved across nesting levels):
    basic.input(X).input-out       → basic.code.X / nested_package.X
    basic.constant(C).constant-out → basic.code.C / nested_package.C
    basic.code.Y / nested_package.Y → basic.output(Y).output-in / next stage

The auto-wirer is label-driven: any output port whose label matches an input
port label on another inner block gets connected. In "nearest" mode every
input claims the first matching upstream output; that's enough for the linear
pipelines our MCP tools generate.
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
    extras: dict[str, Any] | None = None,
) -> dict[str, Any]:
    pos = block["position"]
    return {
        "id": block["id"],
        "locked": False,
        "type": block["type"],
        "selected": False,
        "extras": extras,
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


def _make_link(
    *,
    src_block_id: str,
    src_port_id: str,
    src_pos: dict[str, Any],
    tgt_block_id: str,
    tgt_port_id: str,
    tgt_pos: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "type": "default",
        "source": src_block_id,
        "sourcePort": src_port_id,
        "target": tgt_block_id,
        "targetPort": tgt_port_id,
        "points": [
            {
                "id": str(uuid.uuid4()),
                "type": "point",
                "x": float(src_pos.get("x", 0)),
                "y": float(src_pos.get("y", 0)),
                "selected": False,
            },
            {
                "id": str(uuid.uuid4()),
                "type": "point",
                "x": float(tgt_pos.get("x", 0)),
                "y": float(tgt_pos.get("y", 0)),
                "selected": False,
            },
        ],
        "labels": [],
        "width": 1,
        "color": "rgba(255,255,255,0.5)",
        "curvyness": 50,
        "selectedColor": "rgb(0,192,255)",
    }


def build_package_node(
    *,
    name: str,
    description: str = "",
    input_labels: list[str] | None = None,
    output_labels: list[str] | None = None,
    constants: list[dict[str, Any]] | None = None,
    code: str | None = None,
    nested_packages: list[dict[str, Any]] | None = None,
    x: float = 0,
    y: float = 0,
    dependency_id: str | None = None,
) -> dict[str, Any]:
    """Materialise a `block.package` node fragment.

    Parameters
    ----------
    name, description : str
        Package metadata, surfaced in the tooltip and Project Settings panel
        when the package is the root.
    input_labels, output_labels : list[str]
        Outer port labels. Each generates a `basic.input` / `basic.output`
        block inside the package and a matching port on the outer node.
    constants : list[dict]
        Each entry becomes a `basic.constant` block: `{name, value, local?}`.
    code : str
        Python source for the inner `basic.code` block. Optional — if omitted
        no `basic.code` block is created (useful for wiring-only composer
        packages whose logic lives entirely in nested packages).
    nested_packages : list[dict]
        Sub-packages embedded as `block.package` instances inside this one.
        Each entry is the same shape as the kwargs to this function so the
        spec is fully recursive. The nested package's full dependency tree
        is rolled up under this package's `dependencies` map.

    The auto-wirer connects ports by label match across every inner element
    (basic.* and nested packages alike), producing both the semantic wires
    (`dep.design.graph.wires`) and the visual link models (`node.model.
    layers[diagram-links]`) needed for double-click sub-editor rendering.
    """
    input_labels = list(input_labels or [])
    output_labels = list(output_labels or [])
    constants = list(constants or [])
    nested_packages = list(nested_packages or [])

    node_id = str(uuid.uuid4())
    dep_id = dependency_id or f"block.package.{_short_id(name)}"

    # Column layout: each inner-block kind lives in its own vertical column
    # so the auto-wired flow reads left-to-right.
    col_x = {"input": 250, "constant": 600, "nested": 950, "code": 1300, "output": 1650}
    row_step = 140

    # ---------- 1. Build inner basic.* blocks ----------
    input_blocks: list[dict[str, Any]] = []
    for i, label in enumerate(input_labels):
        bid = str(uuid.uuid4())
        input_blocks.append(_block(bid, "basic.input", {"name": label}, col_x["input"], 200 + i * row_step))

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
        output_blocks.append(_block(bid, "basic.output", {"name": label}, col_x["output"], 250 + i * row_step))

    code_block: dict[str, Any] | None = None
    code_block_id: str | None = None
    code_in_port_names: list[str] = []
    code_out_port_names: list[str] = []
    if code:
        code_block_id = str(uuid.uuid4())
        code_in_port_names = list(input_labels) + [str(c.get("name", f"c_{i}")) for i, c in enumerate(constants)]
        code_out_port_names = list(output_labels)
        code_block = _block(
            code_block_id,
            "basic.code",
            {
                "name": name,
                "code": code,
                "ports": {
                    "in": [{"name": n} for n in code_in_port_names],
                    "out": [{"name": n} for n in code_out_port_names],
                },
                "params": [],
                "frequency": "1",
                "aiDescription": description,
            },
            col_x["code"],
            200,
        )

    # ---------- 2. Recursively build nested packages ----------
    nested_built: list[dict[str, Any]] = []
    nested_row_height = 320  # nested packages eat more vertical room than basic.* blocks
    for i, np_spec in enumerate(nested_packages):
        if not isinstance(np_spec, dict):
            continue
        nb = build_package_node(
            name=str(np_spec.get("name", f"Nested {i}")),
            description=str(np_spec.get("description", "")),
            input_labels=list(np_spec.get("inputs") or []),
            output_labels=list(np_spec.get("outputs") or []),
            constants=list(np_spec.get("constants") or []),
            code=np_spec.get("code"),
            nested_packages=list(np_spec.get("nested_packages") or []),
            x=col_x["nested"],
            y=200 + i * nested_row_height,
        )
        nested_built.append(nb)

    # ---------- 3. Port table for auto-wire ----------
    # block_id → {outputs: [(label, port_id, semantic_port_name)], inputs: [...]}
    # Plus block position for visual link endpoints.
    port_table: dict[str, dict[str, Any]] = {}

    # Visual port models per block (for inner_node_models construction).
    inner_node_port_models: dict[str, list[dict[str, Any]]] = {bid: [] for bid in port_table}

    def _register(
        block_id: str,
        outputs: list[tuple[str, str, str]],  # (label, port_id, semantic_name)
        inputs: list[tuple[str, str, str]],
        pos: dict[str, Any],
    ) -> None:
        port_table[block_id] = {
            "outputs": outputs,
            "inputs": inputs,
            "pos": pos,
        }

    # basic.input — one output port carrying the named value.
    for ib, label in zip(input_blocks, input_labels):
        pid = str(uuid.uuid4())
        _register(ib["id"], [(label, pid, _INPUT_PORT_OUT)], [], ib["position"])
        inner_node_port_models[ib["id"]] = [
            _make_port(port_id=pid, label=_INPUT_PORT_OUT, direction="out", parent_node_id=ib["id"])
        ]

    # basic.constant — one output port.
    for cb, c in zip(constant_blocks, constants):
        cname = str(c.get("name", "c"))
        pid = str(uuid.uuid4())
        _register(cb["id"], [(cname, pid, _CONSTANT_PORT_OUT)], [], cb["position"])
        inner_node_port_models[cb["id"]] = [
            _make_port(port_id=pid, label=_CONSTANT_PORT_OUT, direction="out", parent_node_id=cb["id"])
        ]

    # basic.output — one input port.
    for ob, label in zip(output_blocks, output_labels):
        pid = str(uuid.uuid4())
        _register(ob["id"], [], [(label, pid, _OUTPUT_PORT_IN)], ob["position"])
        inner_node_port_models[ob["id"]] = [
            _make_port(port_id=pid, label=_OUTPUT_PORT_IN, direction="in", parent_node_id=ob["id"])
        ]

    # basic.code — one port per declared input / output, each carrying its label as semantic name.
    if code_block:
        code_ins = []
        code_outs = []
        code_port_models = []
        for nm in code_in_port_names:
            pid = str(uuid.uuid4())
            code_ins.append((nm, pid, nm))
            code_port_models.append(
                _make_port(port_id=pid, label=nm, direction="in", parent_node_id=code_block_id)
            )
        for nm in code_out_port_names:
            pid = str(uuid.uuid4())
            code_outs.append((nm, pid, nm))
            code_port_models.append(
                _make_port(port_id=pid, label=nm, direction="out", parent_node_id=code_block_id)
            )
        _register(code_block["id"], code_outs, code_ins, code_block["position"])
        inner_node_port_models[code_block["id"]] = code_port_models

    # block.package (nested) — outer port ids drive both the auto-wire and the visual link.
    for nb in nested_built:
        outs: list[tuple[str, str, str]] = []
        ins: list[tuple[str, str, str]] = []
        for p in nb["node_model"]["ports"]:
            label = str(p.get("label") or p.get("name") or "")
            if p.get("in"):
                ins.append((label, p["id"], label))
            else:
                outs.append((label, p["id"], label))
        _register(nb["node_id"], outs, ins, nb["node_model"])

    # ---------- 4. Auto-wire by label match ----------
    # For every input port, find the first matching output port on a DIFFERENT
    # block (same label, case-sensitive — labels are user-chosen and should be
    # exact). Once paired, both ports are considered consumed for this pass.
    inner_wires: list[dict[str, Any]] = []
    inner_link_models: dict[str, dict[str, Any]] = {}

    claimed_outputs: set[tuple[str, str]] = set()  # (block_id, port_id)
    for tgt_block_id, info in port_table.items():
        for tgt_label, tgt_port_id, tgt_sem in info["inputs"]:
            match = None
            for src_block_id, src_info in port_table.items():
                if src_block_id == tgt_block_id:
                    continue
                for src_label, src_port_id, src_sem in src_info["outputs"]:
                    if src_label != tgt_label:
                        continue
                    if (src_block_id, src_port_id) in claimed_outputs:
                        continue
                    match = (src_block_id, src_port_id, src_sem, src_info["pos"])
                    break
                if match:
                    break
            if not match:
                continue
            src_block_id, src_port_id, src_sem, src_pos = match
            claimed_outputs.add((src_block_id, src_port_id))

            inner_wires.append(_wire(src_block_id, src_sem, tgt_block_id, tgt_sem))
            link_model = _make_link(
                src_block_id=src_block_id,
                src_port_id=src_port_id,
                src_pos=src_pos,
                tgt_block_id=tgt_block_id,
                tgt_port_id=tgt_port_id,
                tgt_pos=info["pos"],
            )
            inner_link_models[link_model["id"]] = link_model

    # ---------- 5. Inner editor (sub-graph view) ----------
    inner_node_models: dict[str, dict[str, Any]] = {}
    for ib in input_blocks:
        inner_node_models[ib["id"]] = _inner_node_model(ib, ports=inner_node_port_models[ib["id"]])
    for cb in constant_blocks:
        inner_node_models[cb["id"]] = _inner_node_model(cb, ports=inner_node_port_models[cb["id"]])
    for ob in output_blocks:
        inner_node_models[ob["id"]] = _inner_node_model(ob, ports=inner_node_port_models[ob["id"]])
    if code_block:
        inner_node_models[code_block["id"]] = _inner_node_model(
            code_block, ports=inner_node_port_models[code_block["id"]], width=300, height=200
        )
    # Nested packages: drop their outer node_model into our editor verbatim.
    for nb in nested_built:
        inner_node_models[nb["node_id"]] = nb["node_model"]

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

    # ---------- 6. Outer node ----------
    # Inner design = the runtime-side view of this package's sub-graph.
    inner_blocks_all = (
        input_blocks
        + constant_blocks
        + ([code_block] if code_block else [])
        + output_blocks
        + [
            # For runtime resolution, a nested package shows up as a block
            # whose type is its dep id — the renderer treats the entry
            # uniformly. Other nested block tooling resolves it via the
            # outer dependencies map.
            {
                "id": nb["node_id"],
                "type": nb["dependency_id"],
                "position": nb["node_model"].get("position") or {"x": nb["node_model"]["x"], "y": nb["node_model"]["y"]},
                "data": {},
            }
            for nb in nested_built
        ]
    )
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

    # Roll up every nested package's dependency tree under this package.
    rolled_dependencies: dict[str, Any] = {}
    for nb in nested_built:
        rolled_dependencies[nb["dependency_id"]] = nb["dependency"]
        # Also propagate sub-sub dependencies so the runtime sees the full tree.
        sub_deps = nb["dependency"].get("dependencies") or {}
        for sub_id, sub_dep in sub_deps.items():
            rolled_dependencies.setdefault(sub_id, sub_dep)

    # Outer ports — one port per basic.input/output, plus pass-through ports
    # for nested packages would be useful but isn't standard practice; outer
    # ports stay tied to this package's own basic.input/basic.output blocks.
    outer_ports: list[dict[str, Any]] = []
    for ib, label in zip(input_blocks, input_labels):
        outer_ports.append(
            _make_port(
                port_id=str(uuid.uuid4()),
                label=label,
                direction="in",
                parent_node_id=node_id,
                port_name=ib["id"],
            )
        )
    for ob, label in zip(output_blocks, output_labels):
        outer_ports.append(
            _make_port(
                port_id=str(uuid.uuid4()),
                label=label,
                direction="out",
                parent_node_id=node_id,
                port_name=ob["id"],
            )
        )

    outer_node_model = {
        "id": node_id,
        "locked": False,
        "type": "block.package",
        "selected": False,
        "extras": {"name": name, "dependency_id": dep_id},
        "x": x,
        "y": y,
        "data": {"name": name},
        "model": inner_editor,
        "info": project_info,
        "design": inner_design,
        "dependencies": rolled_dependencies,
        "ports": outer_ports,
    }

    dependency = {
        "package": project_info,
        "design": inner_design,
        "dependencies": rolled_dependencies,
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
