/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { BaseModelOptions, DeserializeEvent } from '@projectstorm/react-canvas-core';
import { NodeModelGenerics } from "@projectstorm/react-diagrams";
import { PortModelAlignment } from "@projectstorm/react-diagrams-core";
import { PortTypes } from "../../../../core/constants";
import { PortName } from "../../../../core/serialiser/interfaces";
import BaseModel from "../../common/base-model";
import { createPortModel } from "../../common/factory";

/**
 * Options for Code model
 */
export interface CodeBlockModelOptions extends BaseModelOptions {
    inputs?: string[];
    outputs?: string[];
    params?: string[];
    aiDescription?: string;
}

/**
 * Interface for code block data
 */
export interface CodeBlockData {
    code: string;
    aiDescription: string;
    frequency: string;
    params?: PortName[],
    ports: {
        in: PortName[],
        out: PortName[]
    }
}

/**
 * Data model for Code block
 */
export class CodeBlockModel extends BaseModel<CodeBlockData, NodeModelGenerics & CodeBlockModelOptions> {

    codeBlockOptions!: CodeBlockModelOptions;

    constructor(options: CodeBlockModelOptions) {
        super({
            ...options,
            type: 'basic.code'
        });

        this.codeBlockOptions = options;

        // default code shown on editor
        //     const code = (
        //         `def main(inputs, outputs, parameters, synchronise):
        // pass`);

        const generateCode = (options: CodeBlockModelOptions) => {
            let codeLines = [
                "import time",

                "from lib.utils import Synchronise",
                "from lib.inputs import Inputs",
                "from lib.outputs import Outputs",
                "from lib.parameters import Parameters",
                "def main(inputs:Inputs, outputs:Outputs, parameters:Parameters, synchronise:Synchronise):"
            ];

            // Add parameter retrieval
            if (options.params?.length) {
                codeLines.push('    # Parameters');
                options.params.forEach(param => {
                    codeLines.push(`    ${param} = parameters.get('${param}')`);
                });
            }

            // Add input reading
            if (options.inputs?.length) {
                codeLines.push('    # Read inputs');
                options.inputs.forEach(input => {
                    codeLines.push(`    ${input}_data = inputs.read('${input}')`);
                });
            }
            codeLines.push('');

            // Add processing placeholder
            codeLines.push('    # Process data');
            if (options.outputs?.length) {
                options.outputs.forEach((output, idx) => {
                    const input = options.inputs?.[idx];
                    if (input) {
                        codeLines.push(`    ${output}_result = ${input}_data  # Replace with actual processing`);
                    } else {
                        codeLines.push(`    ${output}_result = None  # Add your processing logic here`);
                    }
                });
            } else {
                codeLines.push('    pass  # Add your processing logic here');
            }

            // Add output writing
            if (options.outputs?.length) {
                codeLines.push('    # Write outputs');
                options.outputs.forEach(output => {
                    codeLines.push(`    outputs.write('${output}', ${output}_result)`);
                });
            }

            // Add synchronization
            codeLines.push('    synchronise()\n');

            // const codeLines = response.choices?.[0]?.message?.content?.split('\n') || [];

            return codeLines.join('\n');
            // return response.choices?.[0]?.message?.content ?? codeLines.join('\n');

        }


        const code = generateCode(options);


        // Initialise data
        this.data = {
            code: code,
            aiDescription: options.aiDescription || '',
            frequency: '30',
            params: options.params?.map((port) => {
                return { name: port }
            }) || [],
            ports: {
                in: options.inputs?.map((port) => {
                    return { name: port }
                }) || [],
                out: options.outputs?.map((port) => {
                    return { name: port }
                }) || []
            },
            size: {
                width: '',
                height: ''
            }
        }

        // Create Input ports for each input option
        options.inputs?.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: true,
                    name: port,
                    alignment: PortModelAlignment.LEFT,
                    type: PortTypes.INPUT,
                    label: port
                })
            );
        });

        // Create Output ports for each output option
        options.outputs?.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: false,
                    name: port,
                    alignment: PortModelAlignment.RIGHT,
                    type: PortTypes.OUTPUT,
                    label: port
                })
            )
        });

        // Create Parameter ports for each parameter option
        options.params?.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: true,
                    name: port,
                    alignment: PortModelAlignment.TOP,
                    type: PortTypes.PARAM,
                    label: port
                })
            )
        });
    }

    updateInputPorts(ports: PortName[]) {
        const validNames = new Set(ports.map(p => p.name));
        console.log('[CodeBlockModel] updateInputPorts target names:', Array.from(validNames));

        // Remove obsolete ports
        Object.values(this.getPorts()).forEach(port => {
            const isInput = port.getOptions().type === PortTypes.INPUT;
            const name = port.getName();
            const shouldKeep = validNames.has(name);

            console.log(`[CodeBlockModel] Checking port '${name}' (type=${port.getOptions().type}): isInput=${isInput}, shouldKeep=${shouldKeep}`);

            if (isInput && !shouldKeep) {
                console.warn(`[CodeBlockModel] Removing obsolete input port: ${name}`);
                this.removePort(port);
            }
        });

        // Add new ports
        ports.forEach((port) => {
            const exists = !!this.getPort(port.name);
            console.log(`[CodeBlockModel] Adding port '${port.name}'? Exists=${exists}`);

            if (!exists) {
                this.addPort(
                    createPortModel({
                        in: true,
                        name: port.name,
                        alignment: PortModelAlignment.LEFT,
                        type: PortTypes.INPUT,
                        label: port.name
                    })
                );
            }
        });
    }

    updateOutputPorts(ports: PortName[]) {
        const validNames = new Set(ports.map(p => p.name));

        // Remove obsolete ports
        Object.values(this.getPorts()).forEach(port => {
            if (port.getOptions().type === PortTypes.OUTPUT && !validNames.has(port.getName())) {
                this.removePort(port);
            }
        });

        // Add new ports
        ports.forEach((port) => {
            if (!this.getPort(port.name)) {
                this.addPort(
                    createPortModel({
                        in: false,
                        name: port.name,
                        alignment: PortModelAlignment.RIGHT,
                        type: PortTypes.OUTPUT,
                        label: port.name
                    })
                );
            }
        });
    }


    updateParamsPorts(ports: PortName[]) {
        const validNames = new Set(ports.map(p => p.name));

        // Remove obsolete ports
        Object.values(this.getPorts()).forEach(port => {
            if (port.getOptions().type === PortTypes.PARAM && !validNames.has(port.getName())) {
                this.removePort(port);
            }
        });

        // Add new ports
        ports.forEach((port) => {
            if (!this.getPort(port.name)) {
                this.addPort(
                    createPortModel({
                        in: true,
                        name: port.name,
                        alignment: PortModelAlignment.TOP,
                        type: PortTypes.PARAM,
                        label: port.name
                    })
                );
            }
        });
    }

    /**
     * Generate inputs from list of output port names.
     * @returns List of input ports
     */
    getInputs() {
        return this.getData().ports.in?.map((port) => this.getPort(port.name)).filter(p => !!p) || [];
    }

    getInputNames() {
        return this.getData().ports.in?.map((port) => port.name) || [];
    }

    /**
     * Generate outputs from list of output port names.
     * @returns List of output ports
     */
    getOutputs() {
        return this.getData().ports.out?.map((port) => this.getPort(port.name)).filter(p => !!p) || [];
    }

    getOutputNames() {
        return this.getData().ports.out?.map((port) => port.name) || [];
    }

    /**
     * Generate outputs from list of parameter port names.
     * @returns List of parameter ports
     */
    getParameters() {
        return this.getData().params?.map((port) => this.getPort(port.name)).filter(p => !!p) || [];
    }

    getParameterNames() {
        return this.getData().params?.map((port) => port.name) || [];
    }

    /**
     * Getter for data object
     * @returns Data object
     */
    getData(): CodeBlockData {
        return this.data;
    }

    update(): CodeBlockData {
        this.data.code = this.getPort('code')?.getOptions() || this.data.code;
        this.data.params = this.getParameterNames()?.map((port) => {
            return { name: port }
        }) || [];

        this.data.ports.in = this.getInputNames()?.map((port) => {
            return { name: port }
        }) || [];

        this.data.ports.out = this.getOutputNames()?.map((port) => {
            return { name: port }
        }) || [];
        return this.data;
    }

    /**
     * Set the width and height of block
     * @param width Width of block
     * @param height Height of block
     */
    setSize(width: number, height: number): void {
        const size = {
            width: width.toString() + 'px',
            height: height.toString() + 'px'
        }
        this.data.size = size;

    }

    setData(_data: any): void {
        // _data = _data as CodeBlockData;
        console.log('setData', _data);
        this.data = {
            ...this.data,
            ..._data
        }
        this.updateInputPorts(this.data.ports.in || []);
        this.updateOutputPorts(this.data.ports.out || []);
        this.updateParamsPorts(this.data.params || []);
    }

    /**
     * Serialise data and model
     * @returns Serialised model and data
     */
    serialize() {
        return {
            ...super.serialize(),
            data: this.getData()
        }
    }

    /**
     * Deserialise model and data
     * @param event Event which indicates model to deserialise data
     */
    deserialize(event: DeserializeEvent<this>): void {
        super.deserialize(event);
        this.data = event.data.data;
    }

}