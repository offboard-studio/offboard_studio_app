import * as React from 'react';
import { DefaultLinkFactory } from '@projectstorm/react-diagrams';
import { CustomLinkWidget } from './custom-link-widget';

export class CustomLinkFactory extends DefaultLinkFactory {
    constructor() {
        super();
    }

    generateReactWidget(event: any): JSX.Element {
        return <CustomLinkWidget link={event.model} diagramEngine={this.engine} />;
    }
}
