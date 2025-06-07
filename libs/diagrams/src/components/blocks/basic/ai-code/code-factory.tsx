/* eslint-disable @typescript-eslint/no-unused-vars */
import { AbstractReactFactory, GenerateModelEvent, GenerateWidgetEvent } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import React from 'react';
import Editor from '../../../../core/editor';
import { AiCodeBlockModel, AiCodeBlockModelOptions } from './code-model';
import { AiCodeBlockWidget } from './code-widget';


/**
 * Factory for Code block
 */
export class AiCodeBlockFactory extends AbstractReactFactory<AiCodeBlockModel, DiagramEngine> {

    private editor: Editor;
    // private selectingNode: boolean = false;
    private selected: boolean = false;
    constructor(editor: Editor) {
        super('basic.aicode');
        this.editor = editor;
        // this.selectingNode = selectingNode;
    }

    generateModel(event: GenerateModelEvent): AiCodeBlockModel {
        const options = event.initialConfig as AiCodeBlockModelOptions
        return new AiCodeBlockModel(options);
    }

    generateReactWidget(event: GenerateWidgetEvent<AiCodeBlockModel>): JSX.Element {
        return <AiCodeBlockWidget engine={this.engine} node={event.model} editor={this.editor} />;
    }
}