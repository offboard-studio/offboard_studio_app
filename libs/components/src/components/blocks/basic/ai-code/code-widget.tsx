/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
} from '@mui/material';
import MonacoEditor from '@monaco-editor/react';

import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import CSS from 'csstype';
import React, {
  ChangeEvent,
  Fragment,
  MouseEventHandler,
  WheelEventHandler,
} from 'react';
import Editor from '../../../../core/editor';
import { GlobalState } from '../../../../core/store';
import BaseBlock, { ContextOption } from '../../common/base-block';
import BasePort from '../../common/base-port';
import { AiCodeBlockModel } from './code-model';
import { unitConversion } from '../../../utils/tooltip/index';
import './styles.scss';

import loader from '@monaco-editor/loader';

// CDN'den yükle
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
  },
});

/**
 * Interface for code block widget props
 */
export interface AiCodeBlockWidgetProps {
  node: AiCodeBlockModel;
  engine: DiagramEngine;
  editor: Editor;
  // selectingNode: boolean;
}

/**
 * Interface for code block widget state
 */
export interface AiCodeBlockWidgetState {
  // For code text
  code: string;
  width: string;
  height: string;
  frequency: string;
  // selectingNode: boolean
}

/**
 * Widget for the code block
 */
export class AiCodeBlockWidget extends React.Component<
  AiCodeBlockWidgetProps,
  AiCodeBlockWidgetState
> {
  static contextType = GlobalState as React.Context<unknown>;
  readonly contextOptions: ContextOption[] = [
    { key: 'delete', label: 'Delete' },
    { key: 'editAI', label: 'Edit With AI from Prompt' },
    { key: 'edit', label: 'Edit with Code' },
  ];

  constructor(props: AiCodeBlockWidgetProps) {
    super(props);
    this.state = {
      // selectingNode:this.props.selectingNode,
      code: this.props.node.data.code || '',
      width: this.props.node.data.size?.width || '300px',
      height: this.props.node.data.size?.height || '300px',
      frequency: this.props.node.data.frequency,
    };
  }

  options = {
    selectOnLineNumbers: true,
    quickSuggestions: true,
    python: {
      suggest: {
        enabled: true,
      },
      validate: {
        enable: true,
      },
    },
    formatOnType: true, // Enable Prettier formatting on type
    formatOnPaste: true, // Enable Prettier formatting on paste
    wordWrap: 'on', // Enable word wrap for better formatting
    automaticLayout: true, // Enable automatic layout adjustment
    lineNumbersMinChars: 3, // Set the minimum number of characters to display for line numbers
    scrollbar: {
      alwaysConsumeMouseWheel: false, // Allow the page to scroll when the mouse wheel is over the editor
    },
  };

  /**
   * Handler for context menu
   * @param key Key cooresponding to the context menu clicked
   */
  async onContextMenu(key: string) {
    switch (key) {
      case 'delete':
        this.props.editor.removeNode(this.props.node);
        break;
      case 'editAI':
        const data: any = await this.props.editor.editAINode(this.props.node);
        console.log('Data from rename', data);
        // this.props.node.setName(data.name);
        // this.setState
        this.setState({ code: data.code });
        break;
      case 'edit':
        await this.props.editor.editNode(this.props.node);
        // this.props.editor.rearrangementNode(this.props.node);
        break;
      default:
        break;
    }
  }

  render() {
    const { state } = this.context as { state: any };
    const textAreaStyle: CSS.Properties = {
      width: this.state.width,
      height: this.state.height,
    };
    console.log('Code block widget render,', this.props.node.isSelected());

    return (
      <BaseBlock
        selected={this.props.node.isSelected()}
        contextOptions={this.contextOptions}
        contextHandler={this.onContextMenu.bind(this)}
      >
        <div>
          <Card variant="outlined" className="block-basic-code" raised>
            <CardHeader
              className="block-basic-code-frequency"
              title={
                <Fragment>
                  <span className="block-basic-code-frequency-text">Freq:</span>
                  <TextField
                    variant="outlined"
                    defaultValue={this.state.frequency}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="start">Hz</InputAdornment>
                      ),
                    }}
                    type="text"
                    margin="dense"
                    value={this.state.frequency}
                    onChange={this.handleFrequencyInput}
                    onWheel={this.blockScrollEvents}
                    className="block-basic-code-frequency-input"
                  />
                </Fragment>
              }
            ></CardHeader>
            <CardContent className="p-0">
              <div className="block-basic-code-parameters">
                {this.props.node.getParameters().map((port) => {
                  console.error('Port is undefined or null', port);
                  return (
                    <BasePort
                      className="code-parameter-port"
                      port={port!}
                      engine={this.props.engine}
                      isInput={true}
                      key={port?.getID()}
                    ></BasePort>
                  );
                })}
              </div>
              <div className="grid-container">
                <div className="block-basic-code-inputs">
                  {this.props.node.getInputs().map((port, index) => {
                    return (
                      <BasePort
                        className="code-input-port"
                        port={port!}
                        engine={this.props.engine}
                        isInput={true}
                        key={port?.getID()}
                      ></BasePort>
                    );
                  })}
                </div>
                <div
                  className="block-basic-code-textarea-container"
                  onMouseDown={this.blockMouseEvents}
                  onMouseUp={this.handleResize}
                  onWheel={this.blockScrollEvents}
                  style={textAreaStyle}
                >
                  <MonacoEditor
                    height={state.height}
                    width={state.width}
                    language="python"
                    defaultValue={this.state.code}
                    value={this.state.code}
                    onChange={this.handleInput}
                    theme="vs-dark"
                  />
                </div>

                <div className="block-basic-code-outputs">
                  {this.props.node.getOutputs().map((port) => {
                    console.log('port is ', port);
                    return (
                      <BasePort
                        className="code-output-port"
                        port={port!}
                        engine={this.props.engine}
                        isInput={false}
                        key={port?.getID()}
                      ></BasePort>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </BaseBlock>
    );
  }

  /**
   * Callback when code input field changes
   * @param event Change event from Code text area
   */
  handleInput = (value: string | undefined) => {
    this.setState({ code: value || '' });
    this.props.node.data.code = value || '';
  };

  handleFrequencyInput = (event: ChangeEvent<HTMLInputElement>) => {
    // Convert the input value using a unit conversion function (it returns a string)
    const actual_val = parseFloat(unitConversion(event.target.value));

    // Update the component state with the raw input value
    this.setState({ frequency: event.target.value });

    // Update the frequency data in the component's props with the parsed numerical value (actual_val)
    this.props.node.data.frequency = actual_val;
  };

  /**
   * Block all mouse click events, so that its not handled by the editor.
   * This is to make sure that dragging or selecting inside the text area is handled within the text area.
   * @param event Mouse click events
   */
  blockMouseEvents: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  /**
   * Block all mouse scroll events from code text area, so that its not handled by the editor.
   * This is to make sure that scrolling on the text area doesnt scroll the whole window.
   * @param event Mouse scroll events
   */
  blockScrollEvents: WheelEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  /**
   * Callback for text area resize. When the size of block changes, store it so that it can be serialised.
   * @param event Text area resize event
   */
  handleResize: MouseEventHandler<HTMLDivElement> = (event) => {
    const element = event.target as HTMLDivElement;
    this.props.node.setSize(
      Math.max(element.clientWidth, 300),
      Math.max(element.clientHeight, 300)
    );
  };
}
