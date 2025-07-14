/* eslint-disable @typescript-eslint/no-unused-vars */
import useTheme from '@mui/material/styles/useTheme';
import { ControlledMenu, MenuItem, useMenuState } from '@szhsin/react-menu';
import React, { MouseEvent, useState } from 'react';
import './styles.scss';

type ContextHandlerFunction = (key: string) => void;

export interface ContextOption {
  key: string;
  label: string;
}

interface BaseBlockProps {
  selected: boolean;
  contextOptions?: ContextOption[];
  contextHandler?: ContextHandlerFunction;

}

const BaseBlock: React.FC<BaseBlockProps> = (props) => {
  const selectedClass = props.selected ? 'selected' : '';
  const options = props.contextOptions || [];
  const contextHandler =
    options.length > 0 && props.contextHandler
      ? props.contextHandler
      : (_: string) => { };
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { toggleMenu, ...menuProps } = useMenuState();
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [showRightPanel, setShowRightPanel] = useState(false); // <-- NEW STATE

  const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setAnchorPoint({ x: event.clientX, y: event.clientY });
    toggleMenu('initial');
    // setShowRightPanel(true); // <-- Show sidebar on right-click
  };

  return (
    <>
    <div
        className= {`block-container ${selectedClass}`
}
onContextMenu = { openContextMenu }
  >
  { props.children }
{
  options.length > 0 && (
    <ControlledMenu
            { ...menuProps }
            anchorPoint = { anchorPoint }
  theming = { isDark? 'white': 'dark' }
  className = "context-menu"
  onMouseLeave = {() => toggleMenu('initial')
}
onKeyDown = {(e) => e.stopPropagation()}
          >
{
  options.map((option, index) => (
    <MenuItem key= { index } onClick = {() => contextHandler(option.key)} >
  { option.label }
  </MenuItem>
            ))}
</ControlledMenu>
        )}
</div>

{/* RIGHT SIDEBAR */ }

{/*{showRightPanel && (
          <div
            className="right-sidebar"
            style={{
              position: 'fixed',
                          top: 0,
                          right: 0,
                          width: '150px',
                          height: '100vh',
                          backgroundColor: '#333',
                          color: 'white',
                          padding: '10px',
                          zIndex: 2000,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '-2px 0 5px rgba(0,0,0,0.3)',
                      }}
                  >
                      <p>Here</p>
                  </div>
              )} */}
</>
  );
};

export default BaseBlock;
