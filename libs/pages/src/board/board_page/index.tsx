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
  Tooltip,
  IconButton,
  Divider,
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
import CollaborationManager from '@components/core/collaboration';
import { useAuth } from '@components/auth/AuthProvider';
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

interface FileHelper {
  fileName: string;
  reader: FileReader;
}


export const BoardPage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get projectId from URL params
  const searchParams = new URLSearchParams(location.search);
  const projectId = searchParams.get('id') || 'default-project';

  const projectReader: FileHelper = { 'fileName': '', 'reader': new FileReader() };
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

  const [isLoadingProject, setIsLoadingProject] = useState(true);

  React.useEffect(() => {
    const collaborationManager = CollaborationManager.getInstance();
    if (user) {
      setIsLoadingProject(true);
      collaborationManager.setUserId(user.uid);
      collaborationManager.startCollaboration(projectId).then(() => {
        setIsLoadingProject(false);
      }).catch((error) => {
        console.error('Failed to start collaboration:', error);
        setIsLoadingProject(false);
      });
    }

    return () => {
      collaborationManager.stopCollaboration();
    };
  }, [user, projectId]);

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
    if (model) {
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

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="App" style={{ backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <AppBar
        className="app-bar"
        position="static"
        sx={{
          bgcolor: '#111',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'none'
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          selectionFollowsFocus
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': { bgcolor: '#BB86FC' }
          }}
        >
          <Box
            component="div"
            onClick={handleBackToDashboard}
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#BB86FC' }}>OFFBOARD</Typography>
          </Box>
          <Tab
            label="Board"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: '#666',
              '&.Mui-selected': { color: '#BB86FC' }
            }}
          />
          <Button
            color="inherit"
            onClick={() => setTabIndexBoard(true)}
            startIcon={<SettingsIcon />}
            sx={{ textTransform: 'none', px: 2 }}
          >
            Settings
          </Button>
          <Button
            color="inherit"
            onClick={() => setAiOptionBlockDialog(true)}
            startIcon={<SettingsEthernet />}
            sx={{ textTransform: 'none', px: 2 }}
          >
            AI Config
          </Button>

          <div style={{ flex: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pr: 2 }}>
            <Tooltip title="Build project">
              <IconButton
                color="inherit"
                onClick={buildAndDownload}
                size="small"
                sx={{
                  color: '#666',
                  '&:hover': { color: '#BB86FC', bgcolor: 'rgba(187, 134, 252, 0.1)' }
                }}
              >
                <DownloadingIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save locally">
              <IconButton
                color="inherit"
                onClick={saveProject}
                size="small"
                sx={{
                  color: '#666',
                  '&:hover': { color: '#BB86FC', bgcolor: 'rgba(187, 134, 252, 0.1)' }
                }}
              >
                <CloudDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open local project">
              <IconButton
                color="inherit"
                onClick={openProject}
                size="small"
                sx={{
                  color: '#666',
                  '&:hover': { color: '#BB86FC', bgcolor: 'rgba(187, 134, 252, 0.1)' }
                }}
              >
                <CloudUploadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 20, my: 'auto', borderColor: '#333' }} />
            <BoardUserButton />
          </Box>
        </Tabs>

        <a href="/" id="buildProjectLink" hidden download>Build Project</a>
        <a href="/" id="saveProjectLink" hidden download>Download Project</a>
        <input type='file' id='openProjectInput' accept={PROJECT_FILE_EXTENSION}
          onChange={(event) => onFileUpload(event, projectReader)} hidden />
      </AppBar>


      {tabIndex === 0 && (
        <div style={{ display: 'flex', flexGrow: 1 }}>
          {isLoadingProject ? (
            <Box sx={{
              display: 'flex',
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#0a0a0a',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography sx={{ color: '#666', fontSize: '0.9rem' }}>
                Loading project...
              </Typography>
              <Box sx={{
                width: 40,
                height: 40,
                border: '3px solid #222',
                borderTopColor: '#BB86FC',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
            </Box>
          ) : (
            <div className="board-container" style={{ display: 'flex', flexGrow: 1, backgroundColor: '#0a0a0a' }}>
              <BoardSidebar editor={editor} />
              <div className="main-content">
                <div className="App theme-dark">
                  <GlobalState.Provider value={{ state, setState }}>
                    <Board editor={editor} />
                  </GlobalState.Provider>
                </div>
                <ModalContainer />
              </div>
            </div>
          )}
        </div>
      )}

      {aiOptionBlockDialog && (
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

      {tabIndexBoard && (
        <BoardSettings
          editor={editor}
          onClose={() => {
            setTabIndexBoard(false);
          }}
        />
      )}
    </div>
  );
};

export default BoardPage;
