import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  Grid,
  Paper,
  Divider,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Autocomplete,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@components/auth/AuthProvider';
import { firebaseProjectService } from '@components/infrastructure/firebase/firebase.project.service';
import { IProject } from '@components/core/interfaces/project.service.interface';
import { AnalyticsDashboard } from '@components/components/dashboard/analytics';
import { DocumentationViewer } from '@components/components/dashboard/documentation-viewer';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import ExtensionIcon from '@mui/icons-material/Extension';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Menu, MenuItem } from '@mui/material';

const drawerWidth = 260;

export const DashboardPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Collaboration State
  const [collabOpen, setCollabOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Card menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<IProject | null>(null);

  // Documentation Dialog State
  const [docsOpen, setDocsOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<IProject | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // All users for autocomplete
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Section navigation
  const [activeSection, setActiveSection] = useState<'dashboard' | 'projects' | 'analytics'>('dashboard');

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await firebaseProjectService.getProjects(user!.uid);
      setProjects(data);
      // TODO: Add real-time listener here for live updates across all users
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;

    setIsCreating(true);
    try {
      const projectId = await firebaseProjectService.createProject({
        name: newProjectName,
        ownerId: user.uid,
        status: 'draft',
      });
      setOpenDialog(false);
      setNewProjectName('');
      navigate(`/board?id=${projectId}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  const handleOpenCollab = async (project: IProject) => {
    setSelectedProject(project);
    setCollabOpen(true);
    setErrorMessage('');
    setSelectedUser(null);

    // Fetch all users for autocomplete
    try {
      const users = await firebaseProjectService.getAllUsers();
      setAllUsers(users.filter((u: any) => u.uid !== user?.uid)); // Exclude current user
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleInvite = async () => {
    if (!selectedProject || !selectedUser) return;

    setIsInviting(true);
    setErrorMessage('');

    try {
      await firebaseProjectService.addMember(selectedProject.id, selectedUser.email);
      setSelectedUser(null);
      alert('Member invited successfully!');
      // Refresh project to show new member (ideally we should fetch member names but UID is fine for now)
      const updated = await firebaseProjectService.getProject(selectedProject.id);
      if (updated) setSelectedProject(updated);
      fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invitation failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;
    try {
      await firebaseProjectService.removeMember(selectedProject.id, memberId);
      const updated = await firebaseProjectService.getProject(selectedProject.id);
      if (updated) setSelectedProject(updated);
      fetchProjects();
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
    if (selectedProject?.members) {
      fetchMemberProfiles(selectedProject.members);
    }
  }, [selectedProject?.members]);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, project: IProject) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuProject(project);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuProject(null);
  };

  const handleViewDetails = () => {
    if (menuProject) {
      navigate(`/project/${menuProject.id}`);
    }
    handleCloseMenu();
  };

  const handleOpenDocs = (project: IProject | null) => {
    if (project) {
      setViewingProject(project);
      setDocsOpen(true);
    }
    handleCloseMenu();
  };

  const handleOpenEditor = () => {
    if (menuProject) {
      navigate(`/board?id=${menuProject.id}`);
    }
    handleCloseMenu();
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const renderContent = () => {
    if (activeSection === 'analytics') {
      return <AnalyticsDashboard projects={projects} />;
    }

    // Default to projects view (also used for 'dashboard' for now, can be customized later)
    return (
      <Grid container spacing={3}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, bgcolor: '#111' }} />
            </Grid>
          ))
        ) : filteredProjects.length === 0 && searchQuery ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 8, textAlign: 'center', bgcolor: '#111', borderRadius: 4, border: '1px dashed #222' }}>
              <SearchIcon sx={{ fontSize: 64, color: '#222', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#555', mb: 2 }}>No projects found</Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>Try searching with different keywords</Typography>
              <Button variant="outlined" onClick={() => setSearchQuery('')}>Clear search</Button>
            </Paper>
          </Grid>
        ) : filteredProjects.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 8, textAlign: 'center', bgcolor: '#111', borderRadius: 4, border: '1px dashed #222' }}>
              <FolderIcon sx={{ fontSize: 64, color: '#222', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#555', mb: 2 }}>No projects yet</Typography>
              <Button variant="outlined" onClick={() => setOpenDialog(true)}>Create your first project</Button>
            </Paper>
          </Grid>
        ) : (
          filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  bgcolor: '#111',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.03)',
                  transition: '0.3s',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    borderColor: '#BB86FC',
                    '& .project-overlay': { opacity: 1 }
                  }
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/board?id=${project.id}`)}
                  sx={{ p: 0 }}
                >
                  <Box sx={{
                    height: 140,
                    bgcolor: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    overflow: 'hidden',
                    backgroundImage: project.image ? `url(${project.image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}>
                    {!project.image && <ExtensionIcon sx={{ fontSize: 48, color: '#333' }} />}
                    <Box
                      className="project-overlay"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.4)', // Darker overlay for images
                        opacity: 0,
                        transition: '0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)'
                      }}
                    >
                      <Typography sx={{ color: '#BB86FC', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Open Project</Typography>
                    </Box>
                  </Box>
                </CardActionArea>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2, flex: 1 }}>
                      {project.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={project.status}
                        size="small"
                        color={getStatusColor(project.status) as any}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                      {project.visibility === 'public' && (
                        <Chip
                          label="Public"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(3, 218, 198, 0.1)',
                            color: '#03DAC6',
                            border: '1px solid #03DAC6'
                          }}
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, project)}
                        sx={{ color: '#666', '&:hover': { color: '#BB86FC' } }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>
                      Modified {project.updatedAt?.toDate ? project.updatedAt.toDate().toLocaleDateString() : 'recently'}
                    </Typography>
                    <Tooltip title="Manage Collaborators">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCollab(project);
                        }}
                        sx={{ color: '#555', '&:hover': { color: '#BB86FC' } }}
                      >
                        <PeopleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0a0a0a', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#0a0a0a',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          },
        }}
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center', p: 3, bgcolor: '#111' }}>
          <Box
            component="img"
            src="/assets/logo.png"
            sx={{ height: 32, mr: 1, filter: 'drop-shadow(0 0 8px rgba(187, 134, 252, 0.5))' }}
            onError={(e: any) => e.target.style.display = 'none'}
          />
          <Typography variant="h6" sx={{ fontWeight: 800, background: 'linear-gradient(45deg, #BB86FC 30%, #03DAC6 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            OFFBOARD
          </Typography>
        </Toolbar>

        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              borderRadius: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 14px 0 rgba(187, 134, 252, 0.39)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(187, 134, 252, 0.5)',
              }
            }}
          >
            New Project
          </Button>
        </Box>

        <List sx={{ px: 2 }}>
          {[
            { text: 'Dashboard', icon: <DashboardIcon />, section: 'dashboard' as const },
            { text: 'Projects', icon: <FolderIcon />, section: 'projects' as const },
            { text: 'Analytics', icon: <AssessmentIcon />, section: 'analytics' as const },
          ].map((item) => (
            <ListItemButton
              key={item.text}
              selected={activeSection === item.section}
              onClick={() => setActiveSection(item.section)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: activeSection === item.section ? '#BB86FC' : '#666',
                bgcolor: activeSection === item.section ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(187, 134, 252, 0.1)',
                  color: '#BB86FC'
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(187, 134, 252, 0.15)',
                  '&:hover': { bgcolor: 'rgba(187, 134, 252, 0.2)' }
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ mt: 'auto', p: 2 }}>
          <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
          <List>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: '#f44336' }}>
              <ListItemIcon sx={{ color: '#f44336', minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, pt: 2 }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
                Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Manage your robotics simulation projects and components
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#1a1a1a',
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <SearchIcon sx={{ color: '#444', mr: 1 }} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '0.9rem',
                    width: '200px'
                  }}
                />
              </Box>
              <Tooltip title="Account settings">
                <Avatar
                  onClick={() => navigate('/user')}
                  sx={{
                    bgcolor: '#BB86FC',
                    cursor: 'pointer',
                    width: 40,
                    height: 40,
                    boxShadow: '0 0 10px rgba(187, 134, 252, 0.3)'
                  }}
                  src={user?.photoURL || ''}
                >
                  {user?.displayName?.[0] || 'U'}
                </Avatar>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>


        {renderContent()}
      </Box>

      {/* Project Card Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            minWidth: 200
          }
        }}
      >
        <MenuItem
          onClick={handleViewDetails}
          sx={{
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(187, 134, 252, 0.1)' }
          }}
        >
          <InfoIcon sx={{ mr: 1.5, fontSize: 20, color: '#BB86FC' }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={handleOpenEditor}
          sx={{
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(187, 134, 252, 0.1)' }
          }}
        >
          <OpenInNewIcon sx={{ mr: 1.5, fontSize: 20, color: '#BB86FC' }} />
          Open Editor
        </MenuItem>
        <MenuItem
          onClick={() => {
            // Navigate to documentation or open dialog (simplest: navigate to new route or use state)
            // For now, let's use a dialog or just log it, but based on plan we need to display it.
            // Let's assume we want to show it in the dashboard area or a dedicated page.
            // I'll update activeSection to 'documentation' and set selectedViewingProject
            // But wait, the current structure supports sections. Let's add 'documentation' section dynamically or just a simple way.
            // BETTER APPROACH for this turn: Add a proper "Documentation" section that shows docs for selected project?
            // OR: Just open a Dialog with DocumentationViewer.
            // I'll go with Dialog for quick win as it keeps context.
            handleOpenDocs(menuProject);
          }}
          sx={{
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(187, 134, 252, 0.1)' }
          }}
        >
          <AssessmentIcon sx={{ mr: 1.5, fontSize: 20, color: '#BB86FC' }} />
          Documentation
        </MenuItem>
      </Menu>

      {/* New Project Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            bgcolor: '#111',
            borderRadius: 4,
            minWidth: 400,
            border: '1px solid rgba(255,255,255,0.05)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 800 }}>Create New Project</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
            Give your robotics simulation project a name to get started.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            disabled={isCreating}
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
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: '#666' }}>Cancel</Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProjectName.trim() || isCreating}
            sx={{ borderRadius: 2, px: 4 }}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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
              onClick={handleInvite}
              disabled={!selectedUser || isInviting}
              startIcon={<PersonAddIcon />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {isInviting ? 'Sending...' : 'Invite'}
            </Button>
          </Box>

          <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
            Current Members
          </Typography>
          <List>
            {selectedProject?.members?.map((memberId) => {
              const profile = memberProfiles.find(p => p.uid === memberId);
              const isOwner = memberId === selectedProject?.ownerId;
              const isMe = memberId === user?.uid;

              return (
                <ListItem
                  key={memberId}
                  secondaryAction={
                    !isOwner && isMe === false && user?.uid === selectedProject?.ownerId && (
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


      {/* Documentation Dialog */}
      <Dialog
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.05)',
            minHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {viewingProject?.name}
          <IconButton onClick={() => setDocsOpen(false)} sx={{ color: '#555' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingProject && (
            <DocumentationViewer
              content={viewingProject.documentationUrl ? "Loading content from " + viewingProject.documentationUrl : ''}
              videoUrl={viewingProject.videoUrl}
              projectName={viewingProject.name}
            />
          )}
          {/* Note: In a real app, we would fetch the markdown content from the URL here */}
        </DialogContent>
      </Dialog>
    </Box >
  );
};
