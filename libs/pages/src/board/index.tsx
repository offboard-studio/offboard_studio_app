import Fab from '@mui/material/Fab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import React, { useState, useEffect } from 'react';
import CanvasContainer from '@components/components/canvas/canvas-container';
import Editor from '@components/core/editor';
import { useGlobalState } from '@components/core/store';
import MiniMapWidget from '@components/components/common/minimap-widget';
import './styles.scss';

import { LinkModel } from '@projectstorm/react-diagrams';
import ContextMenu from '@components/components/common/context-menu';

interface BoardProps {
  editor: Editor;
}

/**
 * Board component containing editor canvas.
 * @param props
 */
function Board(props: BoardProps) {
  const { editor } = props;
  const { state } = useGlobalState();
  const [updateCount, setUpdateCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; linkId: string } | null>(null);

  useEffect(() => {
    // Force re-render when model changes
    const handleModelChange = () => {
      console.log('Board: handleModelChange triggered, forcing update');
      setUpdateCount(prev => prev + 1);
    };

    const unsubscribe = editor.addOnModelChange(handleModelChange);
    return () => {
      console.log('Board: unmounting/cleaning up listener');
      unsubscribe();
    };
  }, [editor]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();

    // Attempt to find if we clicked on a selected link
    // React-Diagrams usually selects the item on right-click (mousedown)
    // We check the selected items.
    const selectedItems = editor.activeModel.getSelectedEntities();
    const selectedLink = selectedItems.find(item => item instanceof LinkModel);

    if (selectedLink) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        linkId: selectedLink.getID()
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleDelete = () => {
    if (contextMenu?.linkId) {
      const link = editor.activeModel.getLink(contextMenu.linkId);
      if (link) {
        console.log(`[Board] Deleting link ${contextMenu.linkId}`);
        link.remove();
        editor.engine.repaintCanvas();
        // Trigger update explicitly just in case
        setUpdateCount(prev => prev + 1);
      }
    }
    setContextMenu(null);
  };

  const handleBoardClick = () => {
    if (contextMenu) setContextMenu(null);
  };

  return (
    <div id="board" onContextMenu={handleContextMenu} onClick={handleBoardClick}>
      {state.showingPackage && <Toolbar editor={editor} />}
      <CanvasContainer>
        <CanvasWidget key={`canvas-${editor.engine.getModel().getID()}-${updateCount}`} engine={editor.engine} />
      </CanvasContainer>
      <MiniMapWidget editor={editor} />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

/**
 * Transparent toolbar with only Lock and Go Back buttons visible.
 * @param props {editor: Editor}
 */
const Toolbar: React.FC<{ editor: Editor }> = (props) => {
  const { state, setState } = useGlobalState();

  const setLock = (lock: boolean) => {
    // Lock the editor to prevent any modifications
    props.editor.setLock(lock);
    setState({ ...state, locked: lock });
  };

  const goBack = () => {
    // Go up one level in the stack (to previous circuit model)
    props.editor.goToPreviousModel();
    // Set whether it is still showing a package block
    setState({
      ...state,
      showingPackage: props.editor.showingPackage(),
      locked: false,
    });
  };

  return (
    <div id="toolbar">
      <Fab
        style={{ marginLeft: '250px' }}
        variant="extended"
        size="small"
        className="toolbar-button"
        onClick={() => goBack()}
      >
        <ArrowBackIcon />
        Back
      </Fab>
      <div className="flex-spacer"></div>
      {state.locked && (
        <Fab
          size="small"
          className="toolbar-button"
          onClick={() => setLock(false)}
        >
          <LockIcon />
        </Fab>
      )}

      {!state.locked && (
        <Fab
          size="small"
          className="toolbar-button"
          onClick={() => setLock(true)}
        >
          <LockOpenIcon />
        </Fab>
      )}
    </div>
  );
};

export default Board;
