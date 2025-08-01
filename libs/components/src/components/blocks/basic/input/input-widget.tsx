
import { DiagramEngine } from "@projectstorm/react-diagrams";
import React from "react";
import Editor from "../../../../core/editor";
import BaseBlock, { ContextOption } from "../../common/base-block";
import BasePort from "../../common/base-port";
import { InputBlockModel } from "./input-model";
import './styles.scss';
import { Card, CardContent } from "@mui/material";



/**
 * Interface for Input block widget props
 */
export interface InputBlockWidgetProps {
    node: InputBlockModel;
    engine: DiagramEngine;
    editor: Editor;
}

/**
 * Widget for the Input block
 */
export class InputBlockWidget extends React.Component<InputBlockWidgetProps> {

    readonly contextOptions: ContextOption[] = [{key: 'rename', label: 'Rename'}, {key: 'delete', label: 'Delete'}];

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown); // Adding keydown event listener when component mounts
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown); // Removing keydown event listener when component unmounts
    }

    /**
     * Handler for context menu
     * @param key Key cooresponding to the context menu clicked
     */
    onContextMenu(key: string) {
        switch (key) {
            case 'delete':
                this.props.editor.removeNode(this.props.node);
                break;
            case 'rename':
                this.props.editor.editNode(this.props.node);
                break;
            default:
                break;
        }
        
    }

    render() {
        return (
            <BaseBlock selected={this.props.node.isSelected()} contextOptions={this.contextOptions}
                 contextHandler={this.onContextMenu.bind(this)}>
                <div>
                    <Card variant='outlined' className="block-basic-input" raised>
                        <CardContent className='p-0'>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <p className='text-center' style={{ flex: 1 }}>{this.props.node.data.name}</p>
                                <BasePort className='input-output-port'
                                    port={this.props.node.getPort()}
                                    engine={this.props.engine}
                                    isInput={false}>
                                </BasePort>
                            </div>

                        </CardContent>
                    </Card>

                </div>
            </BaseBlock>
        );
    }

       /**
     * Keydown event handler to listen for Alt+R key combination
     * @param event Keydown event
     */
       handleKeyDown = (event: KeyboardEvent) => {
        const { node } = this.props;
        if (event.altKey && (event.key === 'r' || event.key === 'R') && node.isSelected()) {
            this.props.editor.editNode(node); // Trigger rename action
        }
    }
}