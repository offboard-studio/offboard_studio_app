/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AppBar,
  Avatar,
  Box,
  createTheme,
  Drawer,
  Tab,
  Tabs,
  Toolbar,
  ThemeProvider,
  Typography,
} from '@mui/material';
import React, { Fragment, useState } from 'react';
import ModalContainer from 'react-modal-promise';
// import '../../../App.scss';
import '../styles.scss';
import Editor from '../../../core/editor';
import {
  GlobalState,
  GlobalStateComponent,
  IGlobalState,
} from '../../../core/store';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import DownloadingIcon from '@mui/icons-material/Downloading';
import SettingsIcon from '@mui/icons-material/Settings';

import BoardSidebar from '../../../components/board-sidebar';
import { Button } from '@mui/material';
import BoardUserButton from '../../../components/board/user';
import { DownloadRounded, FileDownload } from '@mui/icons-material';
import { textFile2DataURL } from '../../../core/utils';
import { PROJECT_FILE_EXTENSION } from '../../../core/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import BoardSettings from '../board_setting';
import Board from '..';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});

export const BoardPage = (): JSX.Element => {
  const location = useLocation();
  const editorState = location.state || {};

  const navigate = useNavigate();

  const isElectron = window.location.protocol === 'file:';


  const [tabIndex, setTabIndex] = useState(0);
  const [tabIndexBoard, setTabIndexBoard] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
  };

  const editor = Editor.getInstance();

  const [state, setState] = useState<IGlobalState>({
    locked: editor.locked(),
    showingPackage: editor.showingPackage(),
  });

  const saveProject = () => {
    const model = editor.serialise();
    const url = textFile2DataURL(JSON.stringify(model), 'text/json');
    const link = document.getElementById('saveProjectLink');
    link?.setAttribute('href', url);
    link?.setAttribute('download', editor.getName() + PROJECT_FILE_EXTENSION);
    link?.click();
  };

  const buildAndDownload = () => {


    const model = editor.serialise();
    let filename = editor.getName();
    // if (process.env.REACT_APP_BACKEND_HOST && model) {
    if (model) {
      // const url = process.env.REACT_APP_BACKEND_HOST + 'build';
      const url = 'https://offboard-studio-backend.vercel.app/api/build';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(model),
        headers: headers,
      })
        .then((response) => {
          if (response.ok) {
            const header = response.headers.get('Content-Disposition');
            filename = header?.split(';')[1]?.split('=')[1] || filename;
            return response.blob();
          }
          throw Error('Something went wrong!');
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.getElementById('buildProjectLink');
          link?.setAttribute('href', url);
          link?.setAttribute(
            'download',
            filename.replace(/^"(.+(?="$))"$/, '$1')
          );
          link?.click();
        })
        .catch((reason) => {
          alert(reason);
        });
    }
  };

  return (
    <div className="App">
      <AppBar className="app-bar" position="static">
        <Tabs value={tabIndex} onChange={handleTabChange} selectionFollowsFocus>
          <Tab label="Board" />
          <Button
            color="inherit"
            onClick={() => {
              setTabIndexBoard(true);
            }}
            startIcon={<SettingsIcon />}
          />

          <div style={{ flex: 10 }} />
          <Button
            color="inherit"
            onClick={buildAndDownload}
            startIcon={<DownloadingIcon />}
          />
          <Button
            color="inherit"
            onClick={saveProject}
            startIcon={<CloudDownloadIcon />}
          />
          <Button
            color="inherit"
            onClick={saveProject}
            startIcon={<CloudUploadIcon />}
          />
          <div style={{ flex: 1 }} />
          <BoardUserButton></BoardUserButton>
        </Tabs>

        <a href="/" id="buildProjectLink" hidden download>
          Build Project
        </a>
        <a href="/" id="saveProjectLink" hidden download>
          Download Project
        </a>
      </AppBar>

      {tabIndex === 0 && (
        <div style={{ display: 'flex', flexGrow: 1 }}>
          <div
            className="board-container"
            style={{ display: 'flex', flexGrow: 1 }}
          >
            <BoardSidebar editor={editor} />
            
            <div className="main-content">
              <ThemeProvider theme={darkTheme}>
                <div className="App theme-dark">
                  <GlobalState.Provider value={{ state, setState }}>
                    <Board editor={editor} />
                    {/*  sağ tarafta ai response kodlarını verdir. */}
                  </GlobalState.Provider>
                </div>
                <ModalContainer />
              </ThemeProvider>
            </div>
          </div>
        </div>
      )}

      {tabIndexBoard === true && (
        <BoardSettings
          editor={editor}
          onClose={() => {
            navigate(isElectron ? '/#/' : '/');
            setTabIndexBoard(false);
          }}
        />
      )}
    </div>
  );
};

export default BoardPage;
