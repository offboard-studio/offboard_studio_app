import { DiagramModel } from "@projectstorm/react-diagrams";
import { NodeModel } from "@projectstorm/react-diagrams-core";
import { BasePortModel } from "../components/blocks/common/base-port/port-model";
import { PackageBlockModel } from "../components/blocks/package/package-model";
import { PortTypes } from "../core/constants";

const MAX_CODE_CHARS = 1200;
const MAX_BLOCKS_WITH_CODE = 12;

type PortDirection = "in" | "out" | "param";

interface PortInfo {
    name: string;
    direction: PortDirection;
    connectedTo: { block: string; port: string }[];
}

interface BlockSummary {
    id: string;
    type: string;
    label: string;
    isCurrent: boolean;
    aiDescription?: string;
    code?: string;
    value?: string;
    ports: PortInfo[];
}

interface ConnectionInfo {
    fromBlockId: string;
    fromBlockLabel: string;
    fromPort: string;
    toBlockId: string;
    toBlockLabel: string;
    toPort: string;
}

export interface CurrentBlockOverride {
    aiDescription?: string;
    inputs?: string[];
    outputs?: string[];
    params?: string[];
}

export interface BuildProjectContextOptions {
    model: DiagramModel | undefined | null;
    currentNodeId: string;
    projectName?: string;
    currentBlockOverride?: CurrentBlockOverride;
}

function safeGetData(node: NodeModel): Record<string, unknown> {
    const anyNode = node as unknown as { getData?: () => unknown };
    if (typeof anyNode.getData !== "function") return {};
    const data = anyNode.getData();
    return (data && typeof data === "object") ? (data as Record<string, unknown>) : {};
}

function blockLabel(node: NodeModel): string {
    const type = node.getType();
    const data = safeGetData(node);
    const name = typeof data.name === "string" ? data.name : undefined;
    const pkgInfo = (node as unknown as { info?: { name?: string } }).info;
    if (pkgInfo?.name) return `${pkgInfo.name} <${type}>`;
    if (name) return `${name} <${type}>`;
    return type;
}

function classifyPort(type: string | undefined): PortDirection {
    if (type === PortTypes.INPUT) return "in";
    if (type === PortTypes.OUTPUT) return "out";
    return "param";
}

function collectPorts(node: NodeModel, labels: Map<string, string>): PortInfo[] {
    const ports = node.getPorts();
    const result: PortInfo[] = [];

    Object.values(ports).forEach((port) => {
        const opts = (port as unknown as { getOptions?: () => Record<string, unknown> }).getOptions?.() ?? {};
        const portType = typeof opts.type === "string" ? opts.type : undefined;
        const label = typeof opts.label === "string" ? opts.label : (port.getName?.() ?? "");
        const direction = classifyPort(portType);

        const connected: { block: string; port: string }[] = [];
        const links = port.getLinks?.() ?? {};
        Object.values(links).forEach((link) => {
            const src = link.getSourcePort?.();
            const tgt = link.getTargetPort?.();
            if (!src || !tgt) return;
            const other = src === port ? tgt : src;
            if (!other) return;
            const otherNode = other.getParent?.();
            if (!otherNode) return;
            const otherOpts = (other as unknown as { getOptions?: () => Record<string, unknown> }).getOptions?.() ?? {};
            const otherLabel = typeof otherOpts.label === "string" ? otherOpts.label : (other.getName?.() ?? "");
            connected.push({
                block: labels.get(otherNode.getID()) || otherNode.getType(),
                port: otherLabel,
            });
        });

        result.push({ name: label, direction, connectedTo: connected });
    });

    return result;
}

function applyOverride(summary: BlockSummary, override: CurrentBlockOverride | undefined): BlockSummary {
    if (!override || !summary.isCurrent) return summary;
    const overridden: BlockSummary = { ...summary };
    if (override.aiDescription !== undefined) overridden.aiDescription = override.aiDescription;
    if (override.inputs || override.outputs || override.params) {
        const ports: PortInfo[] = [];
        (override.inputs ?? []).forEach((n) => ports.push({ name: n, direction: "in", connectedTo: [] }));
        (override.outputs ?? []).forEach((n) => ports.push({ name: n, direction: "out", connectedTo: [] }));
        (override.params ?? []).forEach((n) => ports.push({ name: n, direction: "param", connectedTo: [] }));
        // Keep any connectedTo info from the live model when the port name matches.
        overridden.ports = ports.map((p) => {
            const live = summary.ports.find((s) => s.name === p.name && s.direction === p.direction);
            return live ? { ...p, connectedTo: live.connectedTo } : p;
        });
    }
    return overridden;
}

function summariseBlock(node: NodeModel, currentNodeId: string, labels: Map<string, string>): BlockSummary {
    const data = safeGetData(node);
    const summary: BlockSummary = {
        id: node.getID(),
        type: node.getType(),
        label: blockLabel(node),
        isCurrent: node.getID() === currentNodeId,
        ports: collectPorts(node, labels),
    };

    const aiDesc = data.aiDescription;
    if (typeof aiDesc === "string" && aiDesc.trim()) {
        summary.aiDescription = aiDesc.trim();
    }

    const code = data.code;
    if (typeof code === "string" && code.trim()) {
        let trimmed = code.trim();
        if (trimmed.length > MAX_CODE_CHARS) {
            trimmed = trimmed.slice(0, MAX_CODE_CHARS) + "\n# ... (truncated)";
        }
        summary.code = trimmed;
    }

    const value = data.value;
    if (typeof value === "string" || typeof value === "number") {
        summary.value = String(value);
    }

    if (node instanceof PackageBlockModel) {
        const info = (node as unknown as { info?: { name?: string; description?: string } }).info;
        if (info?.description) summary.aiDescription = (summary.aiDescription ? summary.aiDescription + " | " : "") + info.description;
    }

    return summary;
}

function collectConnections(model: DiagramModel, labels: Map<string, string>): ConnectionInfo[] {
    const wires: ConnectionInfo[] = [];
    model.getLinks().forEach((link) => {
        const p1 = link.getSourcePort();
        const p2 = link.getTargetPort();
        if (!p1 || !p2) return;
        if (!(p1 instanceof BasePortModel) || !(p2 instanceof BasePortModel)) return;
        const source = p1.getType() === PortTypes.OUTPUT ? p1 : p2;
        const target = p1.getType() === PortTypes.OUTPUT ? p2 : p1;
        const srcNode = source.getParent();
        const tgtNode = target.getParent();
        wires.push({
            fromBlockId: srcNode.getID(),
            fromBlockLabel: labels.get(srcNode.getID()) || srcNode.getType(),
            fromPort: source.getLabel() || source.getName(),
            toBlockId: tgtNode.getID(),
            toBlockLabel: labels.get(tgtNode.getID()) || tgtNode.getType(),
            toPort: target.getLabel() || target.getName(),
        });
    });
    return wires;
}

function renderPorts(ports: PortInfo[], direction: PortDirection): string {
    const filtered = ports.filter((p) => p.direction === direction);
    if (filtered.length === 0) return "(none)";
    return filtered
        .map((p) => {
            if (p.connectedTo.length === 0) return p.name;
            const peers = p.connectedTo.map((c) => `${c.block}.${c.port}`).join(", ");
            return `${p.name} [wired to ${peers}]`;
        })
        .join(", ");
}

/**
 * Build a compact text dump of the whole diagram so the LLM can keep generated
 * code consistent with the rest of the project (port names, types, upstream
 * outputs, downstream consumers). Designed to fit inside a single user message.
 */
export function buildProjectContext(opts: BuildProjectContextOptions): string {
    const { model, currentNodeId, projectName, currentBlockOverride } = opts;
    if (!model) return "";

    const blocks: BlockSummary[] = [];
    const labels = new Map<string, string>();

    model.getNodes().forEach((node) => {
        labels.set(node.getID(), blockLabel(node));
    });

    model.getNodes().forEach((node) => {
        const summary = applyOverride(summariseBlock(node, currentNodeId, labels), currentBlockOverride);
        blocks.push(summary);
    });

    const wires = collectConnections(model, labels);
    const upstream = wires.filter((w) => w.toBlockId === currentNodeId);
    const downstream = wires.filter((w) => w.fromBlockId === currentNodeId);

    let codeBudget = MAX_BLOCKS_WITH_CODE;
    const lines: string[] = [];

    lines.push("# Project graph context");
    if (projectName) lines.push(`Project name: ${projectName}`);
    lines.push(`Total blocks: ${blocks.length}   Total wires: ${wires.length}`);
    lines.push("");

    lines.push("## Blocks");
    blocks.forEach((b) => {
        const marker = b.isCurrent ? "  <-- TARGET BLOCK (generate code for this one)" : "";
        lines.push(`### [${b.id}] ${b.label}${marker}`);
        if (b.aiDescription) lines.push(`description: ${b.aiDescription}`);
        if (b.value !== undefined) lines.push(`constant value: ${b.value}`);
        lines.push(`inputs:  ${renderPorts(b.ports, "in")}`);
        lines.push(`outputs: ${renderPorts(b.ports, "out")}`);
        lines.push(`params:  ${renderPorts(b.ports, "param")}`);
        if (b.code && (b.isCurrent || codeBudget > 0)) {
            if (!b.isCurrent) codeBudget -= 1;
            lines.push("code:");
            lines.push("```python");
            lines.push(b.code);
            lines.push("```");
        }
        lines.push("");
    });

    lines.push("## Wiring (output -> input)");
    if (wires.length === 0) {
        lines.push("(no wires yet)");
    } else {
        wires.forEach((w) => {
            const marker =
                w.fromBlockId === currentNodeId ? " (FROM target)"
                : w.toBlockId === currentNodeId ? " (TO target)"
                : "";
            lines.push(`- ${w.fromBlockLabel}.${w.fromPort}  ->  ${w.toBlockLabel}.${w.toPort}${marker}`);
        });
    }
    lines.push("");

    if (upstream.length) {
        lines.push("## Direct upstream feeding the TARGET block");
        upstream.forEach((w) => {
            lines.push(`- ${w.fromBlockLabel}.${w.fromPort}  ->  target.${w.toPort}`);
        });
        lines.push("");
    }
    if (downstream.length) {
        lines.push("## Direct downstream consuming the TARGET block");
        downstream.forEach((w) => {
            lines.push(`- target.${w.fromPort}  ->  ${w.toBlockLabel}.${w.toPort}`);
        });
        lines.push("");
    }

    lines.push("## Rules when using this context");
    lines.push("- Only emit code for the TARGET block.");
    lines.push("- Match port names exactly — they are the literal strings passed to inputs.read_* / outputs.share_* / parameters.read_*.");
    lines.push("- Pick the read/share variant (number/string/array/image) that is consistent with the upstream output type already used in the graph.");
    lines.push("- If an input port has no upstream wire, assume the value may be missing and guard against None.");
    lines.push("- Do not redefine logic that already lives in another block; trust the upstream output.");

    return lines.join("\n");
}
