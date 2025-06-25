/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/jsx-no-undef */
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
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import React, { Fragment, useState, useEffect, useCallback, ChangeEvent } from 'react';
import ModalContainer from 'react-modal-promise';
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
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import RefreshIcon from '@mui/icons-material/Refresh';

import BoardSidebar from '../../../components/board-sidebar';
import { useSidebar } from '../../../components/board-sidebar/useSideBar';
import { Button } from '@mui/material';
import BoardUserButton from '../../../components/board/user';
import { DownloadingTwoTone, DownloadRounded, FileDownload, WifiProtectedSetupSharp } from '@mui/icons-material';
import { textFile2DataURL } from '../../../core/utils';
import { PROJECT_FILE_EXTENSION } from '../../../core/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import BoardSettings from '../board_setting';
import Board from '..';
import { set } from 'lodash';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minWidth: 'auto',
          padding: '12px 16px',
        },
      },
    },
  },
});

export const BoardPage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const editorState = location.state || {};
  const isElectron = window.location.protocol === 'file:';

  // Enhanced sidebar configuration
  const { stateSidebar, actions: sidebarActions } = useSidebar({
    config: {
      theme: 'dark',
      animations: true,
      autoCollapse: true,
      collapseBreakpoint: 1024, // Larger breakpoint for better UX
      maxLayers: 3,
      showTooltips: true,
    },
    autoClose: false, // Don't auto-close to allow better interaction
    onLayerChange: (layers) => {
      console.log('Sidebar layers changed:', layers.length);
    },
    onCategoryChange: (categoryId) => {
      console.log('Selected category:', categoryId);
    },
  });

  // State management
  const [tabIndex, setTabIndex] = useState(0);
  const [tabIndexBoard, setTabIndexBoard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiBuildLoading, setAiBuildLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const editor = Editor.getInstance();

  const [state, setState] = useState<IGlobalState>({
    locked: editor.locked(),
    showingPackage: editor.showingPackage(),
  });

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
    // Close sidebar layers when switching tabs for cleaner UX
    sidebarActions.closeAllLayers();
  };

  // Show notification helper
  const showNotification = useCallback(
    (
      message: string,
      severity: 'success' | 'error' | 'warning' | 'info' = 'info'
    ) => {
      setNotification({ open: true, message, severity });
    },
    []
  );

  // Enhanced save project with feedback
  const saveProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const model = editor.serialise();

      if (!model) {
        showNotification('No project data to save', 'warning');
        return;
      }

      const url = textFile2DataURL(JSON.stringify(model), 'text/json');
      const link = document.getElementById('saveProjectLink');

      if (link) {
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          editor.getName() + PROJECT_FILE_EXTENSION
        );
        link.click();
        showNotification('Project saved successfully!', 'success');
      } else {
        throw new Error('Save link not found');
      }
    } catch (error) {
      console.error('Save project error:', error);
      showNotification('Failed to save project', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [editor, showNotification]);



  // Define FileHelper type
  type FileHelper = {
    fileName: string;
    reader: FileReader;
  };
  

    const projectReader : FileHelper = {'fileName': '', 'reader': new FileReader()};

    const onFileUpload = (event: ChangeEvent<HTMLInputElement>, fileHelper: FileHelper) => {
        const file = event.target.files?.length ? event.target.files[0] : null;
        event.target.value = '';
        if (file) {
            fileHelper.fileName = file.name;
            fileHelper.reader.readAsText(file);
        }
    }

  
  const uploadProject = () => {
        projectReader.fileName = '';
        // Simulate click to open file selection dialog.
        document.getElementById('openProjectInput')?.click();
        projectReader.reader.onload = (event) => {
            if (event.target?.result) {
                // Parse file as JSON
                // console.log('Loading project from file:', projectReader.fileName);
                // console.log('File content:', event.target.result);
                editor.loadProject(JSON.parse(event.target.result.toString()), projectReader.fileName);
            }
        };
    }



  // Enhanced save project with feedback
  const uploadProject2 = useCallback(async (file) => {
    try {
      setIsLoading(true);

      editor.loadProject(editorState.projectData);
      if (!editorState.projectData) {
        showNotification('No project data to upload', 'warning');
        return;
      }

    } catch (error) {
      console.error('Save project error:', error);
      showNotification('Failed to save project', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [editor, showNotification]);


  // Enhanced build and download with IPC integration
const aiBuildSync = useCallback(async () => {
  try {
    setAiBuildLoading(true);
    const model = editor.serialise();
    
    if (!model) {
      showNotification('No project data to build', 'warning');
      return;
    }

    const filename = editor.getName();
    
    showNotification('Building project...', 'info');
    
    // Check if Electron API is available
    if (window.electronAPI?.ipcRenderer?.aiBuildSync) {
      // Use Electron IPC for download
      const result = await window.electronAPI.ipcRenderer.aiBuildSync({
        buffer: model,
        filename: filename,
        defaultPath: filename
      });

      if (result.success) {
        showNotification(
          `Project built and saved to: ${result.filePath}`,
          'success'
        );
      } else {
        throw new Error(result.error || 'Download failed');
      }
      setAiBuildLoading(false);
    } else {
      // Fallback to browser download if not in Electron
      // console.warn('Electron API not available, falling back to browser download');
      
      // const blob = new Blob([arrayBuffer]);
      // const downloadUrl = URL.createObjectURL(blob);
      // const link = document.getElementById('buildProjectLink') || document.createElement('a');
      
      // if (!link.id) {
      //   link.id = 'buildProjectLink';
      //   link.style.display = 'none';
      //   document.body.appendChild(link);
      // }
      
      // link.setAttribute('href', downloadUrl);
      // link.setAttribute('download', filename);
      // link.click();
      
      // // Cleanup
      // setTimeout(() => {
      //   URL.revokeObjectURL(downloadUrl);
      //   if (!document.getElementById('buildProjectLink')) {
      //     document.body.removeChild(link);
      //   }
      // }, 100);
      
      showNotification('Project built and downloaded successfully!', 'success');
    }

  } catch (error) {
    console.error('Build and download error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    showNotification(`Build failed: ${errorMessage}`, 'error');
  } finally {
    setIsLoading(false);
  }
}, [editor, showNotification]);




  // Enhanced build and download with better error handling
  const buildAndDownload = useCallback(async () => {
    try {
      setIsLoading(true);
      const model = editor.serialise();

      if (!model) {
        showNotification('No project data to build', 'warning');
        return;
      }

      let filename = editor.getName();
      const url = 'https://offboard-studio-backend.vercel.app/api/build';

      showNotification('Building project...', 'info');

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(model),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Build failed: ${response.statusText}`);
      }

      const header = response.headers.get('Content-Disposition');
      filename = header?.split(';')[1]?.split('=')[1] || filename;

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.getElementById('buildProjectLink');
      if (link) {
        link.setAttribute('href', downloadUrl);
        link.setAttribute('download', filename.replace(/^"(.+(?="$))"$/, '$1'));
        link.click();
        showNotification(
          'Project built and downloaded successfully!',
          'success'
        );
      } else {
        throw new Error('Download link not found');
      }
    } catch (error) {
      console.error('Build and download error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showNotification(`Build failed: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [editor, showNotification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            saveProject();
            break;
          case 'b':
            event.preventDefault();
            buildAndDownload();
            break;
          case '\\':
            event.preventDefault();
            sidebarActions.toggleCollapse();
            break;
          case 'Escape':
            event.preventDefault();
            sidebarActions.closeAllLayers();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveProject, buildAndDownload, sidebarActions]);

  // Calculate main content margin based on sidebar state
  const getMainContentStyle = useCallback(() => {
    const baseWidth = stateSidebar.isCollapsed ? 60 : 80;
    let totalWidth = baseWidth;

    // Add width of active layers
    stateSidebar.activeLayers.forEach((layer) => {
      totalWidth += parseInt(layer.width || '200px');
    });

    return {
      marginLeft: `${totalWidth}px`,
      transition: 'margin-left 0.3s ease',
      height: 'calc(100vh - 64px)', // Account for AppBar height
      overflow: 'hidden',
    };
  }, [stateSidebar.isCollapsed, stateSidebar.activeLayers]);

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="App">
        {/* Enhanced AppBar */}
        <AppBar className="app-bar" position="static" elevation={2}>
          <Toolbar>
            {/* Sidebar toggle */}
            <Tooltip
              title={
                stateSidebar.isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'
              }
            >
              <IconButton
                color="inherit"
                onClick={sidebarActions.toggleCollapse}
                edge="start"
                sx={{ mr: 2 }}
              >
                {stateSidebar.isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
              </IconButton>
            </Tooltip>

            {/* Tabs */}
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              selectionFollowsFocus
              sx={{ flexGrow: 1 }}
            >
              <Tab label="Board" />
            </Tabs>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Settings (or click gear)">
                <Button
                  color="inherit"
                  onClick={() => setTabIndexBoard(true)}
                  startIcon={<SettingsIcon />}
                  disabled={isLoading}
                >
                  Settings
                </Button>
              </Tooltip>

              <Tooltip title="Build & Download (Ctrl+B)">
                <Button
                  color="inherit"
                  onClick={buildAndDownload}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DownloadingIcon />
                    )
                  }
                  disabled={isLoading}
                >
                  Build
                </Button>
              </Tooltip>


              <Tooltip title="AI Build (Ctrl+Shift+B)">
                <Button
                  color="inherit"
                  onClick={aiBuildSync}
                  startIcon={
                    aiBuildLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <WifiProtectedSetupSharp />
                    )
                  }
                  disabled={aiBuildLoading}
                >
                  AI Build
                </Button>
              </Tooltip>

              <Tooltip title="Save Project (Ctrl+S)">
                <Button
                  color="inherit"
                  onClick={saveProject}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <CloudDownloadIcon />
                    )
                  }
                  disabled={isLoading}
                >
                  Save
                </Button>
              </Tooltip>

              <Tooltip title="Upload Project">
                <Button
                  color="inherit"
                  onClick={uploadProject} // You might want to implement actual upload logic
                  startIcon={<CloudUploadIcon />}
                  disabled={isLoading}
                >
                  Upload
                </Button>
              </Tooltip>

              <Box sx={{ mx: 1 }}>
                <BoardUserButton />
              </Box>
            </Box>
          </Toolbar>

          {/* Hidden download links */}
          <a href="/" id="buildProjectLink" hidden download>
            Build Project
          </a>
          <a href="/" id="saveProjectLink" hidden download>
            Download Project
          </a>

          <input type='file' id='openProjectInput' accept={PROJECT_FILE_EXTENSION}
              onChange={(event) => onFileUpload(event, projectReader)} hidden />
        </AppBar>

        {/* Main content area */}
        {tabIndex === 0 && (
          <Box
            sx={{ display: 'flex', position: 'relative', overflow: 'hidden' }}
          >
            {/* Enhanced Sidebar */}
            <BoardSidebar
              editor={editor}
              // defaultCollapsed={sidebarState.isCollapsed}
              // maxLayers={3}
            />

            {/* Main board area */}
            <Box className="main-content" sx={getMainContentStyle()}>
              <div
                className="App theme-dark"
                style={{ height: '100%', overflow: 'auto' }}
              >
                <GlobalState.Provider value={{ state, setState }}>
                  <Board editor={editor} />
                </GlobalState.Provider>
              </div>
            </Box>

            {/* Mobile overlay */}
            {sidebarActions.shouldShowOverlay() && (
              <Box
                sx={{
                  position: 'fixed',
                  top: 64, // Below AppBar
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                  display: { xs: 'block', md: 'none' },
                }}
                onClick={sidebarActions.closeAllLayers}
              />
            )}
          </Box>
        )}

        {/* Settings dialog */}
        {tabIndexBoard && (
          <BoardSettings
            editor={editor}
            onClose={() => {
              if (isElectron) {
                navigate('/#/');
              } else {
                navigate('/');
              }
              setTabIndexBoard(false);
            }}
          />
        )}

        {/* Modal container */}
        <ModalContainer />

        {/* Notification snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() =>
              setNotification((prev) => ({ ...prev, open: false }))
            }
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

        {/* Loading overlay for major operations */}
        {isLoading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <Box
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body1">Processing...</Typography>
            </Box>
          </Box>
        )}
      </div>
    </ThemeProvider>
  );
};

export default BoardPage;
