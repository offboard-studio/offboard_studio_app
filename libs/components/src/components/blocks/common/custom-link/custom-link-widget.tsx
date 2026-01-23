import * as React from 'react';
import { DefaultLinkWidget, LinkWidget } from '@projectstorm/react-diagrams';
import { DiagramEngine, LinkModel } from '@projectstorm/react-diagrams-core';
import { Menu, MenuItem } from '@mui/material';

export interface CustomLinkWidgetProps {
    link: LinkModel;
    diagramEngine: DiagramEngine;
}

export const CustomLinkWidget = (props: CustomLinkWidgetProps) => {
    const [contextMenu, setContextMenu] = React.useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation(); // Stop it from bubbling to canvas
        setContextMenu(
            contextMenu === null
                ? {
                    mouseX: event.clientX - 2,
                    mouseY: event.clientY - 4,
                }
                : null,
        );
    };

    const handleClose = () => {
        setContextMenu(null);
    };

    const deleteLink = () => {
        props.link.remove();
        props.diagramEngine.repaintCanvas();
        handleClose();
    };

    return (
        <g onContextMenu={handleContextMenu}>
            <DefaultLinkWidget link={props.link as any} diagramEngine={props.diagramEngine} />
            <Menu
                open={contextMenu !== null}
                onClose={handleClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
                PaperProps={{
                    style: {
                        backgroundColor: '#1e1e1e',
                        color: '#fff',
                        border: '1px solid #333'
                    },
                }}
            >
                <MenuItem onClick={deleteLink} sx={{ 
                    color: '#ff4444',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 68, 68, 0.1)'
                    }
                }}>Delete Wire</MenuItem>
            </Menu>
        </g>
    );
};
