import Fab from '@mui/material/Fab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import React from 'react';
import CanvasContainer from '../../components/canvas/canvas-container';
import Editor from '../../core/editor';
import { useGlobalState } from '../../core/store';
import './styles.scss';

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

  return (
    <div id="board">
      {state.showingPackage && <Toolbar editor={editor} />}
      <CanvasContainer>
      <CanvasWidget engine={editor.engine} />
      </CanvasContainer>
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
