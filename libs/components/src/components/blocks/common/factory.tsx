/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @nx/enforce-module-boundaries */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { AbstractModelFactory, Toolkit } from '@projectstorm/react-canvas-core';
import { LinkModel, NodeModel, PortModel } from "@projectstorm/react-diagrams";
import { DefaultLinkModel, DefaultPortModel } from "@projectstorm/react-diagrams-defaults";
import { RightAngleLinkModel } from "@projectstorm/react-diagrams-routing";
import { PortTypes, ProjectInfo } from '../../../core/constants';
import { Block, Dependency, ProjectDesign, Wire } from '../../../core/serialiser/interfaces';
import createCodeDialog from '../../dialogs/code-block-dialog';
import aiCreateCodeDialog from '../../dialogs/ai-code-block-dialog';
import createConstantDialog from "../../dialogs/constant-block-dialog";
import createIODialog from '../../dialogs/input-output-block-dialog';
import { CodeBlockModel, CodeBlockData } from "../basic/code/code-model";
import { AiCodeBlockModel } from "../basic/ai-code/code-model";
import { ConstantBlockModel } from "../basic/constant/constant-model";
import { InputBlockModel } from '../basic/input/input-model';
import { OutputBlockModel } from '../basic/output/output-model';
import { getCollectionBlock } from '../collection/collection-factory';
import { PackageBlockModel } from '../package/package-model';
import { BaseInputPortModel, BaseOutputPortModel, BaseParameterPortModel, BasePortModelOptions } from './base-port/port-model';
import cloneDeep from 'lodash.clonedeep';
import CodeBlockCreatorAI from '../../../code_block_creator';
import { buildProjectContext } from '../../../code_block_creator/project-context';
import Editor from '../../../core/editor';



/**
 * Port model for wires which bend at 90 degrees. Unused as of now.
 */
export class RightAnglePortModel extends DefaultPortModel {
    createLinkModel(_factory?: AbstractModelFactory<LinkModel>): LinkModel {
        return new RightAngleLinkModel();
    }

    link<T extends LinkModel>(port: PortModel, factory?: AbstractModelFactory<T>): T {
        let link = this.createLinkModel(factory);
        link.setSourcePort(this);
        link.setTargetPort(port);
        return link as T;
    }
}

/**
 * Create port model of either input or output or parameter type.
 * @param options Port options based on which different Port model is created
 * @returns Port model
 */
export const createPortModel = (options: BasePortModelOptions) => {
    switch (options.type) {
        case PortTypes.INPUT:
            return new BaseInputPortModel(options);
        case PortTypes.OUTPUT:
            return new BaseOutputPortModel(options);
        case PortTypes.PARAM:
            return new BaseParameterPortModel(options);
        default:
            return new DefaultPortModel(options);
    }

}

/**
 * Helper function to edit a block.
 * @param node Block to be edited
 */

export const editBlock = async (node: NodeModel) => {
    let data;
    console.log('Edit block', (node));

    try {
        if (node instanceof ConstantBlockModel) {
            data = await createConstantDialog({
                isOpen: true,
                name: node.getData().name,
                local: node.getData().local
            });
            node.setData(data);
        }
        else if (node instanceof CodeBlockModel || node instanceof AiCodeBlockModel) {
            data = await createCodeDialog({
                isOpen: true,
                inputs: node.getInputNames(),
                outputs: node.getOutputNames(),
                params: node.getParameterNames()
            });

            // The CodeBlockModel.setData method now handles smart updates
            // so we don't need to manually manage ports or connections here.
            // Just pass the new configuration.
            let _data = {
                params: data.params?.map((port: string) => {
                    return { name: port }
                }) || [],
                ports: {
                    in: data.inputs?.map((port: string) => {
                        return { name: port }
                    }) || [],
                    out: data.outputs?.map((port: string) => {
                        return { name: port }
                    }) || []
                },
            }
            node.setData(_data);
        }
        else if (node instanceof InputBlockModel || node instanceof OutputBlockModel) {
            data = await createIODialog({
                isOpen: true,
                name: node.getData().name
            });
            node.setData(data);
        }
    } catch (error) {
        console.log(error);
    }
}

// Mevcut bağlantıları koru
function preserveExistingConnections(node: NodeModel) {
    const connections: Array<{
        portId: string;
        portType: string;
        portLabel: string;
        links: Array<{
            linkId: string;
            sourcePortId: string;
            targetPortId: string;
            sourceNodeId: string;
            targetNodeId: string;
        }>;
    }> = [];

    const ports = node.getPorts();
    Object.values(ports).forEach(port => {
        if (port) {
            const links = port.getLinks();
            const linkData = Object.values(links).map(link => ({
                linkId: link.getID(),
                sourcePortId: link.getSourcePort()?.getID() || '',
                targetPortId: link.getTargetPort()?.getID() || '',
                sourceNodeId: link.getSourcePort()?.getParent()?.getID() || '',
                targetNodeId: link.getTargetPort()?.getParent()?.getID() || ''
            }));

            connections.push({
                portId: port.getID(),
                portType: port.getOptions().type || '',
                portLabel: port.getOptions().label || '',
                links: linkData
            });
        }
    });

    return connections;
}

// Node portlarını dikkatli güncelle
function updateNodePortsCarefully(node: any, newData: any, existingConnections: any[]) {
    // Önce yeni data'yı set et
    node.setData(newData);

    // Port'ları yeniden oluştur
    node.setupPorts();

    // Mevcut bağlantıları geri yükle
    setTimeout(() => {
        restoreConnections(node, existingConnections);
    }, 100); // DOM güncellemesi için kısa bekle
}

// Bağlantıları geri yükle
function restoreConnections(node: any, existingConnections: any[]) {
    const engine = node.getOptions().engine;
    if (!engine) return;

    const model = engine.getModel();
    const newPorts = node.getPorts();

    existingConnections.forEach(connectionInfo => {
        // Aynı label'a sahip yeni port'u bul
        const matchingPort = Object.values(newPorts).find((port: any) =>
            port &&
            port.getOptions().label === connectionInfo.portLabel &&
            port.getOptions().type === connectionInfo.portType
        );

        if (matchingPort) {
            // Her link için yeniden bağlantı kur
            connectionInfo.links.forEach((linkInfo: any) => {
                const existingLink = model.getLink(linkInfo.linkId);

                if (existingLink) {
                    // Mevcut link'i güncelle
                    if (connectionInfo.portType === 'port.output') {
                        existingLink.setSourcePort(matchingPort);
                    } else if (connectionInfo.portType === 'port.input') {
                        existingLink.setTargetPort(matchingPort);
                    }
                } else {
                    // Yeni link oluştur (eğer eski link kaybolmuşsa)
                    recreateLink(model, matchingPort, linkInfo, connectionInfo.portType);
                }
            });
        }
    });

    // Canvas'ı yeniden çiz
    engine.repaintCanvas();
}

// Link'i yeniden oluştur
function recreateLink(model: any, port: any, linkInfo: any, portType: string) {
    // Karşı taraftaki node ve port'u bul
    let otherNode, otherPort;

    if (portType === 'port.output') {
        otherNode = model.getNode(linkInfo.targetNodeId);
        if (otherNode) {
            otherPort = otherNode.getPort(linkInfo.targetPortId);
        }
    } else {
        otherNode = model.getNode(linkInfo.sourceNodeId);
        if (otherNode) {
            otherPort = otherNode.getPort(linkInfo.sourcePortId);
        }
    }

    if (otherNode && otherPort) {
        const newLink = new DefaultLinkModel();

        if (portType === 'port.output') {
            newLink.setSourcePort(port);
            newLink.setTargetPort(otherPort);
        } else {
            newLink.setSourcePort(otherPort);
            newLink.setTargetPort(port);
        }

        model.addLink(newLink);
    }
}


export const editAIBlock = async (node: NodeModel) => {
    let data;
    console.log('Edit block', (node));
    try {
        if (node instanceof AiCodeBlockModel) {
            // console.log('AI Code Block', node.getData());
            data = await aiCreateCodeDialog({
                isOpen: true,
                inputs: node.getInputNames(),
                outputs: node.getOutputNames(),
                params: node.getParameterNames(),
                aiDescription: node.getData().aiDescription,
            });

            const block1 = new AiCodeBlockModel(data);
            const codeBlockData = block1.getData();

            const editor: Editor = Editor.getInstance();
            const apiKey = editor.getApiKey();

            const baseurl = editor.getBaseUrl();
            const aiModel = editor.getAiModel();

            const projectContext = buildProjectContext({
                model: editor.activeModel,
                currentNodeId: node.getID(),
                projectName: editor.getName(),
                currentBlockOverride: {
                    aiDescription: data.aiDescription,
                    inputs: data.inputs ?? [],
                    outputs: data.outputs ?? [],
                    params: data.params ?? [],
                },
            });

            const codeBlock = await new CodeBlockCreatorAI(data, block1, apiKey, baseurl, aiModel)
                .generateCodeBlock(codeBlockData, projectContext);


            const codeBlockString = await extractMainPythonFunctionBlock(codeBlock);

            const { inputCalls, outputCalls, parameterCalls } = extractFunctionCalls(codeBlockString);

            console.log('inputCalls', inputCalls);
            console.log('outputCalls', outputCalls);
            console.log('parameterCalls', parameterCalls);
            const uniqueOutputCalls = [...new Set(outputCalls)];
            const uniqueInputCalls = [...new Set(inputCalls)];
            const uniqueParameterCalls = [...new Set(parameterCalls)];
            let dataX = {
                ...data,
                code: codeBlockString,
                params: uniqueParameterCalls.length > 0
                    ? uniqueParameterCalls.map((port: string) => ({ name: port }))
                    : data.params?.map((port: string) => ({ name: port })) || [],
                ports: {
                    in: uniqueInputCalls.length > 0
                        ? uniqueInputCalls.map((port: string) => ({ name: port }))
                        : data.inputs?.map((port: string) => ({ name: port })) || [],
                    out: uniqueOutputCalls.length > 0
                        ? uniqueOutputCalls.map((port: string) => ({ name: port }))
                        : data.outputs?.map((port: string) => ({ name: port })) || [],
                },
            };

            // block = new AiCodeBlockModel(data);

            // Now, update the block with the new data
            node.setData({
                ...dataX,
                aiDescription: data.aiDescription,
                frequency: node.getData().frequency,
                code: codeBlockString || '',
            });

            return dataX;


            let _data = {
                params: data.params?.map((port: string) => {
                    return { name: port }
                }) || [],
                ports: {
                    in: data.inputs?.map((port: string) => {
                        return { name: port }
                    }) || [],
                    out: data.outputs?.map((port: string) => {
                        return { name: port }
                    }) || []
                },
            }

            // CodeBlockModel.setData(data);
            // node.setData(_data);


        }
    } catch (error) {
        console.log(error);
    }
}


// Function to extract inputs.read_number, outputs.share_number, and parameters.read_number
// Function to extract inputs, outputs, and parameters using Regex
function extractFunctionCalls(code: string) {
    const inputCalls: string[] = [];
    const outputCalls: string[] = [];
    const parameterCalls: string[] = [];

    // Valid call patterns
    // inputs.read_number("name") or inputs.read_number('name')
    const inputRegex = /inputs\.read_(?:number|string|array|image)\(\s*(['"])(.*?)\1\s*\)/g;
    
    // outputs.share_number("name") or outputs.share_number('name')
    const outputRegex = /outputs\.share_(?:number|string|array|image)\(\s*(['"])(.*?)\1\s*\)/g;

    // parameters.read_number("name") or parameters.read_number('name')
    const paramRegex = /parameters\.read_(?:number|string)\(\s*(['"])(.*?)\1\s*\)/g;

    let match;

    // Extract Inputs
    while ((match = inputRegex.exec(code)) !== null) {
        // match[2] contains the name (captured group inside quotes)
        inputCalls.push(match[2]);
    }

    // Extract Outputs
    while ((match = outputRegex.exec(code)) !== null) {
        outputCalls.push(match[2]);
    }

    // Extract Parameters
    while ((match = paramRegex.exec(code)) !== null) {
        parameterCalls.push(match[2]);
    }

    return {
        inputCalls,
        outputCalls,
        parameterCalls
    };
}



async function extractMainPythonFunctionBlock(markdown: string): Promise<string> {
    const FALLBACK = [
        "from lib.utils import Synchronise",
        "from lib.inputs import Inputs",
        "from lib.outputs import Outputs",
        "from lib.parameters import Parameters",
        "",
        "def main(inputs: Inputs, outputs: Outputs, parameters: Parameters, synchronise: Synchronise):",
        "    pass"
    ].join("\n");

    if (!markdown) return FALLBACK;

    const collect = (re: RegExp): string[] => {
        const out: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(markdown)) !== null) out.push(m[1]);
        return out;
    };

    // ```python ... ``` (also matches when the model wraps the fence in \boxed{ ... }).
    let fences = collect(/```(?:python|py)\b[^\n]*\r?\n([\s\S]*?)```/gi);

    // No python-tagged fence — accept any fenced block as a last resort.
    if (fences.length === 0) {
        fences = collect(/```[^\n]*\r?\n([\s\S]*?)```/g);
    }

    // Prefer the fence that actually defines main(); otherwise take the first one.
    let code = fences.find((c) => c.includes("def main(")) ?? fences[0] ?? "";

    // Model returned bare code with no fences at all.
    if (!code && markdown.includes("def main(")) {
        code = markdown;
    }

    if (code.includes("def main(")) {
        return code.replace(/\s+$/, "");
    }

    return FALLBACK;
}


/**
 * Helper function to create a block of specified type. For constant blocks the ID is modified to
 * make it semi determinate so that first added block gets lower ID
 * @param name Name / type of the block
 * @param blockCount count of blocks placed (Used as unique ID for constant blocks)
 * @returns block model
 */
export const createBlock = async (name: string, blockCount: number) => {

    let block;
    let data;


    const inputPortsPortModel: { name: string }[] = [];
    const outputPortsPortModel: { name: string }[] = [];
    const paramsPortsPortModel: { name: string }[] = [];



    try {
        switch (name) {
            case 'basic.constant':
                data = await createConstantDialog({ isOpen: true });
                // This is workaround to indicate how blocks should be sorted
                data.id = blockCount.toString().padStart(4, '0') + '-' + Toolkit.UID();
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                block = new ConstantBlockModel(data)
                break;
            case 'basic.code':
                data = await createCodeDialog({ isOpen: true });
                block = new CodeBlockModel(data);

                break;
            case 'basic.aicode':
                data = await aiCreateCodeDialog({ isOpen: true });
                const block1 = new AiCodeBlockModel(data);
                const codeBlockData = block1.getData();
                const editor = Editor.getInstance();
                const codeBlock = await new CodeBlockCreatorAI(data, block1, editor.getApiKey(), editor.getBaseUrl(), editor.getAiModel()).generateCodeBlock(codeBlockData);

                const codeBlockString = await extractMainPythonFunctionBlock(codeBlock);

                const { inputCalls, outputCalls, parameterCalls } = extractFunctionCalls(codeBlockString);

                data = {
                    ...data,
                    code: codeBlockString,
                    inputs: inputCalls,
                    outputs: outputCalls,
                    params: parameterCalls,
                }
                block = new AiCodeBlockModel(data);

                // Now, update the block with the new data
                block.setData({
                    ...block.getData(),
                    code: codeBlockString || '',
                });

                break;
            case 'basic.input':
                data = await createIODialog({ isOpen: true });
                block = new InputBlockModel(data);
                break;
            case 'basic.output':
                data = await createIODialog({ isOpen: true });
                block = new OutputBlockModel(data);
                break;
            default:
                data = await getCollectionBlock(name);
                if (data && data.default) {
                    const { editor, design, dependencies, package: packageInfo } = data.default;
                    block = loadPackage({
                        editor,
                        design,
                        dependencies: dependencies as Dependency,
                        package: packageInfo
                    });
                }
                break;
        }
    } catch (error) {
        console.log(error);
    }
    return block;
}


export const createBlockWithAPI = async (name: string, blockCount: number, dataAPI: any) => {

    let block;
    let data;


    const inputPortsPortModel: { name: string }[] = [];
    const outputPortsPortModel: { name: string }[] = [];
    const paramsPortsPortModel: { name: string }[] = [];



    try {
        switch (name) {
            case 'basic.constant':
                data = await createConstantDialog({ isOpen: true });
                // This is workaround to indicate how blocks should be sorted
                data.id = blockCount.toString().padStart(4, '0') + '-' + Toolkit.UID();
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                block = new ConstantBlockModel(data)
                break;
            case 'basic.code':
                data = await createCodeDialog({ isOpen: true });
                block = new CodeBlockModel(data);

                break;
            case 'basic.aicode':
                data = await aiCreateCodeDialog({ isOpen: true });
                const block1 = new AiCodeBlockModel(data);
                const codeBlockData = block1.getData();
                const editor = Editor.getInstance();
                const codeBlock = await new CodeBlockCreatorAI(data, block1, editor.getApiKey(), editor.getBaseUrl(), editor.getAiModel()).generateCodeBlock(codeBlockData);

                const codeBlockString = await extractMainPythonFunctionBlock(codeBlock);

                const { inputCalls, outputCalls, parameterCalls } = extractFunctionCalls(codeBlockString);

                data = {
                    ...data,
                    code: codeBlockString,
                    inputs: inputCalls,
                    outputs: outputCalls,
                    params: parameterCalls,
                }
                block = new AiCodeBlockModel(data);

                // Now, update the block with the new data
                block.setData({
                    ...block.getData(),
                    code: codeBlockString || '',
                });

                break;
            case 'basic.input':
                data = await createIODialog({ isOpen: true });
                block = new InputBlockModel(data);
                break;
            case 'basic.output':
                data = await createIODialog({ isOpen: true });
                block = new OutputBlockModel(data);
                break;
            default:
                // data = await getCollectionBlock(name);
                data = dataAPI?.json;
                console.log("DATA API", data);
                // console.log("DATA API",data.json);
                if (data && dataAPI?.json) {
                    const { editor, design, dependencies, package: packageInfo } = data;
                    block = loadPackage({
                        editor,
                        design,
                        dependencies: dependencies as Dependency,
                        package: packageInfo
                    });
                }
                break;
        }
    } catch (error) {
        console.log(error);
    }
    return block;
}


/**

 * @param type Type of the block
 * @param name 
 * @returns block model
 */
export const createComposedBlock = async (type: string, name: string) => {
    let block;
    try {
        switch (type) {
            case 'basic.input':
                block = new InputBlockModel({ name: name });
                break;
            case 'basic.output':
                block = new OutputBlockModel({ name: name });
                break;
            default:

        }
    } catch (error) {
        console.log(error);
    }
    return block;
}


/**
 * Load a project as Package block
 * @param jsonModel object conforming to the project structure
     * Project Structure: {
     *      "editor": {...},
     *      "version": "3.0",
     *      "package": {...},
     *      "design": {...},
     *      "dependencies": {...}
     * }
 * @returns Package block
 */
export const loadPackage = (jsonModel: { editor: unknown; design: unknown; dependencies: Dependency; package: ProjectInfo }) => {
    const { editor: originalEditor, design: originalDesign } = jsonModel as { editor: unknown; design: unknown };

    // Clone the original jsonModel to work on copies
    const tempJsonModelDesign = cloneDeep(originalDesign);
    const tempJsonModelEditor = cloneDeep(originalEditor);
    const newIdMap: { [key: string]: string } = {};

    // Function to generate a new UUID
    const generateNewId = () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

    // Generate new IDs for all blocks and store the mapping
    (tempJsonModelDesign as ProjectDesign).graph.blocks.forEach((block: Block) => {
        const newId = generateNewId();
        newIdMap[block.id] = newId;
        block.id = newId;
    });

    // Helper function to update model IDs in the editor layers
    const updateModelIdsInLayer = (layerIndex: number) => {
        const editor = tempJsonModelEditor as { layers: { models: { [key: string]: unknown } }[] };
        const models = editor.layers[layerIndex].models;
        Object.keys(models).forEach(oldId => {
            const block = models[oldId];
            const newId = newIdMap[oldId];

            if (newId) {
                (block as { id: string }).id = newId; // Update the block's internal ID
                models[newId] = block; // Add the block to a new models object with the new ID
                delete models[oldId]; // Delete the old key from the models object
            }
        });
    };

    // Update IDs for both layers (layer 0 and layer 1)
    [0, 1].forEach(updateModelIdsInLayer);

    // Update source and target block IDs for wires
    (tempJsonModelDesign as ProjectDesign).graph.wires.forEach((wire: Wire) => {
        const newSourceId = newIdMap[wire.source.block];
        const newTargetId = newIdMap[wire.target.block];

        if (newSourceId) wire.source.block = newSourceId;
        if (newTargetId) wire.target.block = newTargetId;
    });

    // Create the package block model with updated data
    return new PackageBlockModel({
        model: tempJsonModelEditor,
        design: tempJsonModelDesign as ProjectDesign,
        info: (jsonModel as { package: ProjectInfo }).package,
        dependencies: jsonModel.dependencies,
    });
};


/**
 * Fixed initial position for all blocks.
 * TODO: Better way to pick a position dynamically.
 * @returns Position x, y
 */
export const getInitialPosition = (): [number, number] => {
    return [600, 200]
}

