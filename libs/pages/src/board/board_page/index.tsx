/* eslint-disable @nx/enforce-module-boundaries */
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
import React, { ChangeEvent, Fragment, useState } from 'react';
import ModalContainer from 'react-modal-promise';
// import '../../../App.scss';
import '../styles.scss';
import Editor from '@components/core/editor';
import {
  GlobalState,
  GlobalStateComponent,
  IGlobalState,
} from '@components/core/store';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import DownloadingIcon from '@mui/icons-material/Downloading';
import SettingsIcon from '@mui/icons-material/Settings';

import { Button } from '@mui/material';
import BoardUserButton from '@components/components/board/user';
import { AiOptionBlockDialog, AiInterfaceOptionBlockDialog } from '@components/components/dialogs/ai-option-block-dialog';
import { DownloadRounded, FileDownload, SettingsEthernet } from '@mui/icons-material';
import { textFile2DataURL } from '@components/core/utils';
import { PROJECT_FILE_EXTENSION } from '@components/core/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import BoardSettings from '../board_setting';
import BoardSidebar from '../board_sidebar';
import Board from '..';
import AiOptionSettings from '../ai_option_settings';


const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});


interface FileHelper {
  fileName: string;
  reader: FileReader;
}

export const BoardPage = (): JSX.Element => {
  const location = useLocation();
  const editorState = location.state || {};


  const projectReader: FileHelper = { 'fileName': '', 'reader': new FileReader() };

  const navigate = useNavigate();

  const isElectron = window.location.protocol === 'file:';

  const [tabIndex, setTabIndex] = useState(0);
  const [tabIndexBoard, setTabIndexBoard] = useState(false);
  const [aiOptionBlockDialog, setAiOptionBlockDialog] = useState(false);

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


    /**
     * Callback when file is uploaded.
     * @param event File field change event.
     * @param reader Reader to open the uploaded file as text
     */
    const onFileUpload = (event: ChangeEvent<HTMLInputElement>, fileHelper: FileHelper) => {
        const file = event.target.files?.length ? event.target.files[0] : null;
        event.target.value = '';
        if (file) {
            fileHelper.fileName = file.name;
            fileHelper.reader.readAsText(file);
        }
    }


  const openProject = () => {
    projectReader.fileName = '';
    // Simulate click to open file selection dialog.
    document.getElementById('openProjectInput')?.click();
    projectReader.reader.onload = (event) => {
      if (event.target?.result) {
        // Parse file as JSON
        editor.loadProject(JSON.parse(event.target.result.toString()), projectReader.fileName);
      }
    };
  }



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
          <Button
            color="inherit"
            onClick={() => {
              setAiOptionBlockDialog(true);
            }}
            startIcon={<SettingsEthernet />}
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
            onClick={openProject}
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

        <input type='file' id='openProjectInput' accept={PROJECT_FILE_EXTENSION}
          onChange={(event) => onFileUpload(event, projectReader)} hidden />
      </AppBar>

      {tabIndex === 0 && (
        <div style={{ display: 'flex', flexGrow: 1 }}>
          <div
            className="board-container"
            style={{ display: 'flex', flexGrow: 1 }}
          >
            {/* <BoardSidebar editor={editor} /> */}
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

      {aiOptionBlockDialog == true && (
        <AiOptionSettings
          isOpen={aiOptionBlockDialog}
          editor={editor}
          onClose={() => setAiOptionBlockDialog(false)}
          onResolve={(options: AiInterfaceOptionBlockDialog) => {
            setAiOptionBlockDialog(false);
            editor.setApiKey(options.apiKey || 'ollama');
            editor.setBaseUrl(options.baseUrl || 'http://localhost:11434/v1');
            editor.setAiModel(options.model || 'qwen2.5-coder');
          }}
          apiKey=''
          baseUrl=''
          onReject={() => setAiOptionBlockDialog(false)}
        />
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
