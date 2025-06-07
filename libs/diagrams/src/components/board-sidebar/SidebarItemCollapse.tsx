/* eslint-disable @typescript-eslint/no-unused-vars */
import { Collapse, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useState } from "react";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { CollectionBlockType } from "../blocks/collection/collection-factory";

interface SidebarItemCollapseProps {
    blocks: CollectionBlockType;
    keyPrefix?: string;
    blocks_label?: string;
    setBlock: (type: string) => void;
}

const SidebarItemCollapse: React.FC<SidebarItemCollapseProps> = ({ blocks_label, blocks, keyPrefix = "", setBlock }) => {
    const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({});
    const [isRendered, setIsRendered] = useState(false);
    const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleToggle = (key: string, forceClose = false) => {
        setIsRendered(true);
        setOpenStates((prev) => ({
            ...prev,
            [key]: forceClose ? false : !prev[key],
        }));
    };

    // const handleMouseEnter = (key: string) => {
    //     setHoverTimeout(setTimeout(() => handleToggle(key), 1000));
    // };

    // const handleMouseLeave = (key: string) => {
    //     if (hoverTimeout) {
    //         clearTimeout(hoverTimeout);
    //         setHoverTimeout(null);
    //     }
    //     setTimeout(() => handleToggle(key, true), 1000); // 1 saniye sonra kapanması için
    // };

    const renderBlocks = (blocks: CollectionBlockType, parentKey: string = "") => {
        return Object.entries(blocks).map(([name, block]) => {
            const newKey = parentKey ? `${parentKey}.${name}` : name;
            const isOpen = openStates[newKey] || false;

            return (
                <div key={newKey}>
                    <ListItemButton 
                        onClick={() => block.children ? handleToggle(newKey) : setBlock(newKey)}
                        // onMouseEnter={() => handleMouseEnter(newKey)}
                        // onMouseLeave={() => handleMouseLeave(newKey)}
                    >
                        <ListItemText primary={<Typography>{block.label}</Typography>} />
                        {block.children && (isOpen ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />)}
                    </ListItemButton>
                    {block.children && isRendered && (
                        <Collapse in={isOpen} timeout="auto" unmountOnExit sx={{ pl: 6, maxHeight: "300px", overflowY: "auto" }}>
                            <List component="div" disablePadding>
                                {renderBlocks(block.children, newKey)}
                            </List>
                        </Collapse>
                    )}
                </div>
            );
        });
    };

    return (
        <div style={{ maxHeight: "100vh", overflowY: "auto" }}>
            {/* {blocks_label && (
                <ListItemText primary={<Typography>{blocks_label}</Typography>} />
            )} */}
            <Collapse in={true} timeout="auto"  sx={{ pl: 6 }}>
                <List component="div" disablePadding>
                    {renderBlocks(blocks, keyPrefix)}
                </List>
            </Collapse>
        </div>
    );
};

export default SidebarItemCollapse;