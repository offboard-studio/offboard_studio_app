/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import './styles.scss';
import { Box, Button, Icon, List, Typography } from'@mui/material';
import SidebarItemCollapse from './SidebarItemCollapse';
import Editor from '../../core/editor';


// import logo from '../../assets/images/logo.png';

import { collectionBlocks, CollectionBlockType } from '../blocks/collection/collection-factory';
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import HandymanIcon from '@mui/icons-material/Handyman';
import CloseIcon from '@mui/icons-material/Close';
import HardwareIcon from '@mui/icons-material/Hardware';

import EngineeringIcon from '@mui/icons-material/Engineering';

interface BoardSideBarProps {
    editor: Editor;
}

const BoardSidebar: React.FC<BoardSideBarProps> = (props: BoardSideBarProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [isDetailsSidebarVisible, setIsDetailsSidebarVisible] = useState(false); // Track sidebar visibility
    const [isDetailsArchitectureSidebarVisible, setIsArchitectureDetailsSidebarVisible] = useState(false); // Track sidebar visibility

    let timeoutId: NodeJS.Timeout | null = null; // To store the timeout ID

    const setBlock = (type: string) => {
        props.editor.addBlock(type);
    }

    const [selectedItem, setSelectedItem] = useState<unknown | null>(null); // State to store selected item
    const [selectedArchitectureItem, setSelectedArchitectureItem] = useState<string | null>(null); // State to store selected item


    const handleItemClick = (item: unknown) => {
        setSelectedItem(item); // Set the selected item when clicked

        setIsDetailsSidebarVisible(true); // Show the details sidebar
    };

    const handleArchitectureItemClick = (item: unknown) => {
        setSelectedArchitectureItem(item as string); // Set the selected item when clicked

        setIsArchitectureDetailsSidebarVisible(true); // Show the details sidebar
    };



    // Check window width to toggle the sidebar collapse state
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);

            }
        };

        window.addEventListener('resize', handleResize);

        // Initial check on component mount
        handleResize();

        // Cleanup event listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const handleMouseLeave = () => {
        // Set a timeout to hide the sidebar after 2 seconds
        timeoutId = setTimeout(() => {
            setIsDetailsSidebarVisible(false);
        }, 2000);
    };

    const handleMouseEnter = () => {
        // Clear the timeout if the mouse re-enters the sidebar
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        setIsDetailsSidebarVisible(true);
    };

    return (
        <div className="arhitecture-sidebar-container" style={{ display: 'flex', position: 'relative' }}>
            <div
                className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                style={{
                    width: '30px',
                    background: '#333',
                    color: 'white',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    height: '100vh',
                    position: 'absolute',
                    zIndex: 1000,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <img
                        src={"logo"}
                        alt="Logo"
                        style={{ width: '40px', height: '40px', marginRight: '10px' }}
                    />
                </div>

                <List disablePadding>
                    {[
                        { icon: <HardwareIcon />, label: 'basic' },
                        { icon: <EngineeringIcon />, label: 'control' },
                        { icon: <HandymanIcon />, label: 'robotics' },
                        { icon: <img src={"https://px4.io/wp-content/uploads/2020/03/group-3-1.png"} style={{ width: '20px', height: '20px', marginTop: '5px' }} alt="Logo" />, label: 'robotics' },
                    ].map((item, index) => (
                        <div
                            key={index}
                            style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}
                            onClick={() => handleArchitectureItemClick(item.label)}
                        >
                            {item.icon}
                        </div>
                    ))}
                </List>


            </div>
            {
                isDetailsArchitectureSidebarVisible ? (
                    <div
                        className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                        style={{
                            left: '60px',
                            width: isSidebarCollapsed ? '60px' : '175px',
                            background: '#333',
                            color: 'white',
                            paddingLeft: '16px',
                            paddingRight: '16px',
                            height: '100vh',
                            position: 'absolute',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            // justifyContent: 'space-between',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                                <Typography variant="h6">{selectedArchitectureItem} Menu</Typography>
                            </div>

                            <List disablePadding>
                                {selectedArchitectureItem ? (
                                    <>
                                        {selectedArchitectureItem === 'basic' && (
                                            <div onClick={() => handleItemClick('basic')}>
                                                <Typography variant="body1" style={{ color: 'white' }}>
                                                    Basic
                                                </Typography>
                                            </div>
                                        )}
                                        {selectedArchitectureItem === 'control' && (
                                            <div onClick={() => handleItemClick('processing')}>
                                                <Typography variant="body1" style={{ color: 'white' }}>
                                                    Processing
                                                </Typography>
                                            </div>
                                        )}
                                        {selectedArchitectureItem === 'robotics' && (
                                            <div onClick={() => handleItemClick('drivers')}>
                                                <Typography variant="body1" style={{ color: 'white' }}>
                                                    Drivers
                                                </Typography>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <></>
                                )}
                            </List>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'right', justifyContent: 'flex-end' }} onClick={() => {
                            setIsArchitectureDetailsSidebarVisible(false);
                            setIsDetailsSidebarVisible(false);
                        }}>
                            <CloseIcon />
                        </div>
                    </div>
                ) : (
                    <></>
                )
            }
            {
                isDetailsSidebarVisible ? (
                    <div

                        className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                        style={{
                            left: '265px',
                            display: selectedItem ? 'block' : 'none',
                            background: '#333',
                            color: 'white',
                            height: '100vh',
                            position: 'absolute',
                            zIndex: 1000,
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}

                    >
                        <List disablePadding>

                            {selectedItem ? (
                                <>
                                    <div style={{ textAlign: 'center' }}>
                                        <Typography variant="h6">
                                            Details for {selectedItem}
                                        </Typography>
                                    </div>
                                    {/* Add more detailed content here */}
                                    {selectedItem === 'basic' && (
                                        <div style={{ maxHeight: "100vh", overflowY: "auto", textAlign: "center" }}>
                                            <div onClick={() => setBlock('basic.constant')}>
                                                <Typography variant="body1" style={{ color: 'white', fontSize: '1.2em' }}>
                                                    Constant
                                                </Typography>
                                            </div>
                                            <div onClick={() => setBlock('basic.code')}>
                                                <Typography variant="body1" style={{ color: 'white', fontSize: '1.2em' }}>
                                                    Code
                                                </Typography>
                                            </div>
                                            <div onClick={() => setBlock('basic.input')}>
                                                <Typography variant="body1" style={{ color: 'white', fontSize: '1.2em' }}>
                                                    Input
                                                </Typography>
                                            </div>
                                            <div onClick={() => setBlock('basic.output')}>
                                                <Typography variant="body1" style={{ color: 'white', fontSize: '1.2em' }}>
                                                    Output
                                                </Typography>
                                            </div>
                                            <div onClick={() => setBlock('basic.information')}>
                                                <Typography variant="body1" style={{ color: 'white', fontSize: '1.2em' }}>
                                                    Information
                                                </Typography>
                                            </div>
                                        </div>
                                    )}
                                    {selectedItem === 'processing' && (
                                        <SidebarItemCollapse blocks={collectionBlocks.processing} keyPrefix={'processing'} blocks_label={"label"} setBlock={setBlock} />
                                    )}
                                    {selectedItem === 'drivers' && (
                                        <SidebarItemCollapse blocks={collectionBlocks.drivers} keyPrefix={'drivers'} blocks_label='label' setBlock={setBlock} />
                                    )}
                                </>
                            ) : (
                                <></>
                            )}

                        </List>
                    </div>
                ) : (
                    <></>
                )
            }

        </div>
    );
};

export default BoardSidebar;
