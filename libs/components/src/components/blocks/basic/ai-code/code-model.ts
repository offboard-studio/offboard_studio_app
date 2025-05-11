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
export interface AiCodeBlockModelOptions extends BaseModelOptions {
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
export class AiCodeBlockModel extends BaseModel<CodeBlockData, NodeModelGenerics & AiCodeBlockModelOptions> {

    codeBlockOptions!: AiCodeBlockModelOptions;

    constructor(options: AiCodeBlockModelOptions) {
        super({
            ...options,
            type: 'basic.aicode'
        });

        this.codeBlockOptions = options;

        // default code shown on editor
        //     const code = (
        //         `def main(inputs, outputs, parameters, synchronise):
        // pass`);

        const generateCode = (options: AiCodeBlockModelOptions) => {
            let codeLines = [
                "import zenoh",
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

    inputAddPorts(ports: PortName[]) {
        // Create Input ports for each input option
        ports.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: true,
                    name: port.name,
                    alignment: PortModelAlignment.LEFT,
                    type: PortTypes.INPUT,
                    label: port.name
                })
            );
        });
    }

    outputAddPorts(ports: PortName[]) {
        // Create Input ports for each input option
        ports.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: true,
                    name: port.name,
                    alignment: PortModelAlignment.RIGHT,
                    type: PortTypes.OUTPUT,
                    label: port.name
                })
            );
        });
    }


    paramsAddPorts(ports: PortName[]) {
        // Create Input ports for each input option
        ports.forEach((port) => {
            this.addPort(
                createPortModel({
                    in: true,
                    name: port.name,
                    alignment: PortModelAlignment.LEFT,
                    type: PortTypes.PARAM,
                    label: port.name
                })
            );
        });
    }



    /**
     * Generate inputs from list of output port names.
     * @returns List of input ports
     */
    getInputs() {
        return this.getData().ports.in?.map((port) => this.getPort(port.name)) || [];
    }

    getInputNames() {
        return this.getData().ports.in?.map((port) => port.name) || [];
    }

    /**
     * Generate outputs from list of output port names.
     * @returns List of output ports
     */
    getOutputs() {
        return this.getData().ports.out?.map((port) => this.getPort(port.name)) || [];
    }

    getOutputNames() {
        return this.getData().ports.out?.map((port) => port.name) || [];
    }

    /**
     * Generate outputs from list of parameter port names.
     * @returns List of parameter ports
     */
    getParameters() {
        return this.getData().params?.map((port) => this.getPort(port.name)) || [];
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


    setData(_data: any): void {
        // _data = _data as CodeBlockData;
        console.log('setData', _data);
        this.data = {
            ...this.data,
            ..._data
        }
        this.inputAddPorts(this.data.ports.in || []);
        this.outputAddPorts(this.data.ports.out || []);
        this.paramsAddPorts(this.data.params || []);
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