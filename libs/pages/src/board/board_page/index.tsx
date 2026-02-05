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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import React, { ChangeEvent, Fragment, useState, useEffect } from 'react';
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
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

import DownloadingIcon from '@mui/icons-material/Downloading';
import SettingsIcon from '@mui/icons-material/Settings';
import TerminalIcon from '@mui/icons-material/Terminal';

import { Button } from '@mui/material';
import BoardUserButton from '@components/components/board/user';
import { AiOptionBlockDialog, AiInterfaceOptionBlockDialog } from '@components/components/dialogs/ai-option-block-dialog';
import { DeploymentDialog } from '@components/components/dialogs/deployment-dialog';
import { DownloadRounded, FileDownload, SettingsEthernet } from '@mui/icons-material';
import { textFile2DataURL } from '@components/core/utils';
import { PROJECT_FILE_EXTENSION } from '@components/core/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import BoardSettings from '../board_setting';
import BoardSidebar from '../board_sidebar';
import Board from '..';
import AiOptionSettings from '../ai_option_settings';
import { IProject } from '@components/core/interfaces/project.service.interface';
import { firebaseProjectService } from '@components/infrastructure/firebase/firebase.project.service';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#BB86FC' },
    secondary: { main: '#03DAC6' },
  },
});

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
  const [deploymentOpen, setDeploymentOpen] = useState(false);

  // Collaboration State
  const [collabOpen, setCollabOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<IProject | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
  };

  const editor = Editor.getInstance();

  const [state, setState] = useState<IGlobalState>({
    locked: editor.locked(),
    showingPackage: editor.showingPackage(),
  });

  // Sync editor state with React state
  useEffect(() => {
    const handleEditorChange = () => {
      console.log('[BoardPage] handleEditorChange: showingPackage=', editor.showingPackage());
      setState({
        locked: editor.locked(),
        showingPackage: editor.showingPackage(),
      });
    };

    const unregister = editor.addOnModelChange(handleEditorChange);
    // Initial sync
    handleEditorChange();

    return unregister;
  }, [editor]);

  const [isLoadingProject, setIsLoadingProject] = useState(true);

  React.useEffect(() => {
    const collaborationManager = CollaborationManager.getInstance();
    if (user) {
      setIsLoadingProject(true);
      collaborationManager.setUserId(user.uid);
      collaborationManager.startCollaboration(projectId).then(() => {
        setIsLoadingProject(false);
        // Fetch project data for collaboration dialog
        fetchCurrentProject();
      }).catch((error) => {
        console.error('Failed to start collaboration:', error);
        setIsLoadingProject(false);
      });
    }

    return () => {
      collaborationManager.stopCollaboration();
    };
  }, [user, projectId]);

  // Fetch current project data
  const fetchCurrentProject = async () => {
    try {
      const project = await firebaseProjectService.getProject(projectId);
      if (project) {
        setCurrentProject(project);
        // Sync editor's project info with the fetched data
        if (project.package) {
          editor.editSaveInfoProject(project.package);
        }
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  };

  // Collaboration handlers
  const handleOpenCollab = async () => {
    setCollabOpen(true);
    setErrorMessage('');
    setSelectedUser(null);

    // Fetch all users for autocomplete
    try {
      const users = await firebaseProjectService.getAllUsers();
      setAllUsers(users.filter((u: any) => u.uid !== user?.uid));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddMember = async () => {
    if (!currentProject || !selectedUser) return;

    setIsInviting(true);
    setErrorMessage('');

    try {
      await firebaseProjectService.addMember(currentProject.id, selectedUser.email);
      setSelectedUser(null);
      alert('Member added successfully!');
      await fetchCurrentProject();
    } catch (err: any) {
      setErrorMessage(err.message || 'Addition failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentProject) return;
    try {
      await firebaseProjectService.removeMember(currentProject.id, memberId);
      await fetchCurrentProject();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const fetchMemberProfiles = async (userIds: string[]) => {
    try {
      const profiles = await firebaseProjectService.getUserProfiles(userIds);
      setMemberProfiles(profiles);
    } catch (err) {
      console.error('Failed to fetch user profiles:', err);
    }
  };

  useEffect(() => {
    if (currentProject?.members) {
      fetchMemberProfiles(currentProject.members);
    }
  }, [currentProject?.members]);

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
          <Button
            color="inherit"
            onClick={handleOpenCollab}
            startIcon={<PeopleIcon />}
            sx={{ textTransform: 'none', px: 2, color: '#666', '&:hover': { color: '#BB86FC' } }}
          >
            Collaborators
          </Button>
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


          <Button
            color="inherit"
            onClick={() => setDeploymentOpen(true)}
            startIcon={<TerminalIcon />}
            sx={{ textTransform: 'none', px: 2 }}
          >
            Deploy
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
            <BoardUserButton onSettingsClick={() => setTabIndexBoard(true)} />
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
                <ThemeProvider theme={darkTheme}>
                  <div className="App theme-dark">
                    <GlobalState.Provider value={{ state, setState }}>
                      <Board editor={editor} />
                    </GlobalState.Provider>
                  </div>
                  <ModalContainer />
                </ThemeProvider>
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
          projectId={projectId}
          currentProject={currentProject}
          onSave={fetchCurrentProject}
          onClose={() => {
            setTabIndexBoard(false);
          }}
        />
      )}

      {deploymentOpen && (
        <DeploymentDialog
          open={deploymentOpen}
          onClose={() => setDeploymentOpen(false)}
        />
      )}

      {/* Collaboration Dialog */}
      <Dialog
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#111',
            borderRadius: 4,
            minWidth: 450,
            border: '1px solid rgba(255,255,255,0.05)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Manage Collaborators
          <IconButton onClick={() => setCollabOpen(false)} sx={{ color: '#555' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
            Invite new member
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Autocomplete
              fullWidth
              options={allUsers}
              value={selectedUser}
              onChange={(event, newValue) => {
                setSelectedUser(newValue);
                setErrorMessage('');
              }}
              getOptionLabel={(option) => option.displayName || option.email}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar src={option.photoURL} sx={{ width: 32, height: 32, bgcolor: '#BB86FC' }}>
                    {option.displayName?.[0] || option.email?.[0]}
                  </Avatar>
                  <Box>
                    <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                      {option.displayName || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {option.email}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search users..."
                  error={!!errorMessage}
                  helperText={errorMessage}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#333' },
                      '&:hover fieldset': { borderColor: '#BB86FC' },
                      '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                    },
                    '& .MuiInputLabel-root': { color: '#555' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' },
                  }}
                />
              )}
              sx={{
                '& .MuiAutocomplete-popup': { bgcolor: '#1a1a1a' },
                '& .MuiAutocomplete-option': { color: '#fff' },
              }}
              PaperComponent={({ children }) => (
                <Paper sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
                  {children}
                </Paper>
              )}
            />
            <Button
              variant="contained"
              onClick={handleAddMember}
              disabled={!selectedUser || isInviting}
              startIcon={<PersonAddIcon />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {isInviting ? 'Adding...' : 'Add Member'}
            </Button>
          </Box>

          <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
            Current Members
          </Typography>
          <List>
            {currentProject?.members?.map((memberId) => {
              const profile = memberProfiles.find(p => p.uid === memberId);
              const isOwner = memberId === currentProject?.ownerId;
              const isMe = memberId === user?.uid;

              return (
                <ListItem
                  key={memberId}
                  secondaryAction={
                    !isOwner && isMe === false && user?.uid === currentProject?.ownerId && (
                      <IconButton edge="end" onClick={() => handleRemoveMember(memberId)} sx={{ color: '#f44336' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                  sx={{ px: 0 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar
                      src={profile?.photoURL}
                      sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: isOwner ? '#BB86FC' : '#333' }}
                    >
                      {profile?.displayName?.[0] || profile?.email?.[0] || 'U'}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                          {profile?.displayName || 'Unknown User'}
                        </Typography>
                        {isOwner && (
                          <Chip label="Owner" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(187, 134, 252, 0.2)', color: '#BB86FC' }} />
                        )}
                        {isMe && (
                          <Chip label="You" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                        )}
                      </Box>
                    }
                    secondary={profile?.email || memberId}
                    secondaryTypographyProps={{ color: '#555', fontSize: '0.75rem' }}
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardPage;
