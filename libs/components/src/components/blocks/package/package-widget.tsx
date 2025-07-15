
import { DiagramEngine } from "@projectstorm/react-diagrams";
import React from "react";
import Editor from "@components/core/editor";
import { GlobalState } from "@components/core/store";
import ArrowedTooltip from "../../utils/tooltip";
import BaseBlock, { ContextOption } from "@components/components/blocks/common/base-block";
import BasePort from "@components/components/blocks/common/base-port";
import { PackageBlockModel } from "./package-model";
import './styles.scss';
import { Card, CardContent } from "@mui/material";


/**
 * Interface for Package block widget props
 */
export interface PackageBlockWidgetProps {
    node: PackageBlockModel;
    engine: DiagramEngine;
    editor: Editor;
}

/**
 * Widget for the Package block
 */
export class PackageBlockWidget extends React.Component<PackageBlockWidgetProps> {

    static contextType = GlobalState as React.Context<unknown>;
    readonly contextOptions: ContextOption[] = [{key: 'delete', label: 'Delete'}];

    /**
     * Callback for when a package block is double clicked.
     * It opens the package as the model in current editor.
     * And stores the lockstate and showing package in the widget state.
     */
    openPackage() {
        const {setState} = this.context;
        this.props.editor.openPackage(this.props.node);
        setState({
            locked: this.props.editor.locked(),
            showingPackage: true
        })
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
            default:
                break;
        }
    }

    render() {
        return (
            <BaseBlock 
                selected = {this.props.node.isSelected()} contextOptions={this.contextOptions}
                contextHandler={this.onContextMenu.bind(this)}>
                <div onDoubleClick={() => this.openPackage()}>
                    <Card variant='outlined' className="block-package" raised>
                        <CardContent className='p-0 h-100'>
                            <div className='grid-container h-100'>
                                <div className='block-package-inputs'>
                                    {this.props.node.getInputs().map((port, index) => {
                                        return (
                                        <BasePort className='package-input-port'
                                            port={port!} 
                                            engine={this.props.engine} 
                                            isInput={true}
                                            key={port?.getID()}>
                                        </BasePort>
                                        );
                                    })}
                                </div>
                                
                                <div className='block-package-image-container'>
                                    <ArrowedTooltip 
                                        title={this.props.node.info.description} 
                                        aria-label={this.props.node.info.description}
                                        enterDelay={1000}>
                                    <img 
                                        src={this.props.node.getImage()} 
                                        className='block-package-image' 
                                        draggable={false}
                                        onDragStart={(e) => { e.preventDefault(); }}
                                        alt={this.props.node.info.name}/>
                                    </ArrowedTooltip>
                                </div>
                                <div className='block-package-outputs'>
                                    {this.props.node.getOutputs().map((port) => {
                                        return (
                                        <BasePort className='package-output-port'
                                            port={port!} 
                                            engine={this.props.engine} 
                                            isInput={false}
                                            key={port?.getID()}>
                                        </BasePort>
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

}