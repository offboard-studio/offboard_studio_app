/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @nx/enforce-module-boundaries */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { AbstractModelFactory, Toolkit } from '@projectstorm/react-canvas-core';
import { LinkModel, NodeModel, PortModel } from "@projectstorm/react-diagrams";
import { DefaultPortModel } from "@projectstorm/react-diagrams-defaults";
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
import CodeBlockCreatorAI from '../../../codeBlockCreator';



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
            data = await createConstantDialog({ isOpen: true, name: node.getData().name, local: node.getData().local });
            node.setData(data);
        } else if (node instanceof AiCodeBlockModel) {
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
            const codeBlock = await new CodeBlockCreatorAI(data, block1).generateCodeBlock(codeBlockData);


            const codeBlockString = await extractMainPythonFunctionBlock(codeBlock);

            const { inputCalls, outputCalls, parameterCalls } = extractFunctionCalls(codeBlockString);

            let dataX = {
                ...data,
                code: codeBlockString,
                params: parameterCalls != null ? parameterCalls.map((port: string) => {
                    return { name: port }
                }) : data.params?.map((port: string) => {
                    return { name: port }
                }) || [],
                ports: {
                    in: inputCalls != null ? inputCalls.map((port: string) => {
                        return { name: port }
                    }) : data.inputs?.map((port: string) => {
                        return { name: port }
                    }) || [],
                    out: outputCalls != null ? outputCalls.map((port: string) => {
                        return { name: port }
                    }) : data.outputs?.map((port: string) => {
                        return { name: port }
                    }) || []
                },
            }

            // block = new AiCodeBlockModel(data);

            // Now, update the block with the new data
            node.setData({
                ...dataX,
                aiDescription: data.aiDescription,
                frequency: node.getData().frequency,
                code: codeBlockString || '',
            });


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
        else if (node instanceof CodeBlockModel) {
            data = await createCodeDialog({
                isOpen: true,
                // onReject(reason) {
                //     console.log('onReject', reason);
                // },
                // onResolve: async (aaa) => {
                //     console.log('onResolve', aaa);
                // },
                inputs: node.getInputNames(), outputs: node.getOutputNames(), params: node.getParameterNames()
            });
            console.log('Code Block', data);
            // code: string;
            //     aiDescription: string;
            //     frequency: string;
            //     params?: PortName[],
            //     ports: {
            //         in: PortName[],
            //         out: PortName[]
            //     }

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
            node.setData(_data);

        } else if (node instanceof InputBlockModel || node instanceof OutputBlockModel) {
            data = await createIODialog({ isOpen: true, name: node.getData().name });
            node.setData(data);
        }
    } catch (error) {
        console.log(error);
    }
}


// Function to extract inputs.read_number, outputs.share_number, and parameters.read_number
function extractFunctionCalls(code: string) {
    const inputCalls: string[] = [];
    const outputCalls: string[] = [];
    const parameterCalls: string[] = [];

    // Extract inputs.read_number calls
    const inputParts = code.split('inputs.read_number(');
    inputParts.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            inputCalls.push(match[1]);
        }
    });
    const inputPartsImage = code.split('inputs.read_image(');
    inputPartsImage.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            inputCalls.push(match[1]);
        }
    });

    // Extract inputs.read_number calls
    const inputPartsString = code.split('inputs.read_string(');
    inputPartsString.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            inputCalls.push(match[1]);
        }
    });

    // Extract inputs.read_number calls
    const inputPartsArray = code.split('inputs.read_array(');
    inputPartsArray.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            inputCalls.push(match[1]);
        }
    });

    // const outputParts = code.split(/outputs\.share_(string:number|image|array|string)\(/); // share_number ve share_image için


    // Extract outputs.share_number calls
    const outputParts = code.split('outputs.share_number(');
    outputParts.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            outputCalls.push(match[1]);
        }
    });

    // // Extract outputs.share_number calls
    const outputPartsArray = code.split('outputs.share_array(');
    outputPartsArray.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            outputCalls.push(match[1]);
        }
    });
    // Extract outputs.share_number calls
    const outputPartsImage = code.split('outputs.share_image(');
    outputPartsImage.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            outputCalls.push(match[1]);
        }
    });
     const outputPartsString = code.split('outputs.share_string(');
    outputPartsString.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            outputCalls.push(match[1]);
        }
    });

    // Extract parameters.read_number calls
    const parameterParts = code.split('parameters.read_number(');
    parameterParts.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            parameterCalls.push(match[1]);
        }
    });

    // Extract parameters.read_number calls
    const parameterPartsString = code.split('parameters.read_string(');
    parameterPartsString.forEach(part => {
        const match = part.match(/^"([^"]+)"/);
        if (match) {
            parameterCalls.push(match[1]);
        }
    });


    return {
        inputCalls,
        outputCalls,
        parameterCalls
    };
}


// async function extractMainPythonFunctionBlock(markdown: string): Promise<string> {
//     const lines = markdown.split("\n");
//     let isCode = false;
//     let isPython = false;
//     let codeBuffer = [];
//     console.log('Markdown', markdown);

//     for (const line of lines) {
//         console.log('Line', line);
//         if (line.startsWith("\boxed{")) {
//             console.log('Boxed', line);
//             if (isCode) {
//                 console.log('Code', codeBuffer);
//                 if (isPython) {
//                     const code = codeBuffer.join("\n");
//                     if (code.includes("def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):")) {
//                         return code;
//                     }
//                 }
//                 // codeBuffer = [];
//             }
//             isCode = !isCode;
//             isPython = line.includes("```python"); // Sadece Python bloklarını işlemek için
//         } else if (isCode) {
//             codeBuffer.push(line);
//         }
//     }

//     let codeLines = [
//         "import zenoh",
//         "import time",

//         "from lib.utils import Synchronise",
//         "from lib.inputs import Inputs",
//         "from lib.outputs import Outputs",
//         "from lib.parameters import Parameters",
//         "def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):",
//         "    pass",
//     ];

//     // Eğer uygun bir kod bloğu bulunmazsa boş bir Python bloğu döndür
//     return codeLines.join("\n");
// }

async function extractMainPythonFunctionBlock(markdown: string): Promise<string> {
    const lines = markdown.split("\n");

    let insideBoxed = false;
    let insidePythonCode = false;
    let codeBuffer: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Tek satırda açılan durum: \boxed{```python
        if (trimmed.startsWith("\\boxed{```python")) {
            insideBoxed = true;
            insidePythonCode = true;
            continue;
        }

        // Eğer ayrı ayrıysa: \boxed{ satırı
        if (trimmed.startsWith("\\boxed{")) {
            insideBoxed = true;
            continue;
        }

        // Kod bloğu başlangıcı
        if (insideBoxed && trimmed === "```python") {
            insidePythonCode = true;
            continue;
        }

        // Kod bloğu sonu (``` veya ```})
        if (insidePythonCode && (trimmed === "```" || trimmed === "```}")) {
            insidePythonCode = false;
            insideBoxed = false;
            continue;
        }

        // Kod içeriğini topla
        if (insidePythonCode) {
            codeBuffer.push(line);
        }
    }

    const code = codeBuffer.join("\n");

    if (code.includes("def main(")) {
        return code;
    }

    // Eğer bulunamazsa bir iskelet dön
    return [
        "from lib.utils import Synchronise",
        "from lib.inputs import Inputs",
        "from lib.outputs import Outputs",
        "from lib.parameters import Parameters",
        "",
        "def main(inputs: Inputs, outputs: Outputs, parameters: Parameters, synchronise: Synchronise):",
        "    pass"
    ].join("\n");
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
                // const codeBlockData = block1.getData();
                // const codeBlock = await new CodeBlockCreatorAI(data, block1).generateCodeBlock(codeBlockData);

                // const codeBlockString = await extractMainPythonFunctionBlock(codeBlock);

                // const { inputCalls, outputCalls, parameterCalls } = extractFunctionCalls(codeBlockString);

                // data = {
                //     ...data,
                //     code: codeBlockString,
                //     inputs: inputCalls,
                //     outputs: outputCalls,
                //     params: parameterCalls,
                // }
                // block = new CodeBlockModel(data);

                // Now, update the block with the new data
                // block.setData({
                //     ...block1.getData(),
                //     // code: codeBlockString || '',
                // });

                break;
            case 'basic.aicode':
                data = await aiCreateCodeDialog({ isOpen: true });
                const block1 = new AiCodeBlockModel(data);
                const codeBlockData = block1.getData();
                const codeBlock = await new CodeBlockCreatorAI(data, block1).generateCodeBlock(codeBlockData);

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

