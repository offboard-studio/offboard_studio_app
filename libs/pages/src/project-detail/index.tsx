import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  Avatar,
  Divider,
  Button,
  Skeleton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  OpenInNew as OpenInNewIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Extension as ExtensionIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useAuth } from '@components/auth/AuthProvider';
import { firebaseProjectService } from '@components/infrastructure/firebase/firebase.project.service';
import { IProject } from '@components/core/interfaces/project.service.interface';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [memberProfiles, setMemberProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      setLoading(true);

      // Start real-time listener
      const unsubscribe = firebaseProjectService.startListeningToProject(id, async (projectData) => {
        setProject(projectData);
        setLoading(false);

        // Load member profiles when members change
        if (projectData.members && projectData.members.length > 0) {
          const profiles = await firebaseProjectService.getUserProfiles(projectData.members);
          setMemberProfiles(profiles);
        }
      });

      return () => {
        unsubscribe(); // Cleanup listener on unmount
      };
    }
  }, [id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#03DAC6';
      case 'draft': return '#FFC107';
      case 'completed': return '#4CAF50';
      case 'archived': return '#666';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, bgcolor: '#111' }} />
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4, bgcolor: '#111', mt: 3 }} />
        </Container>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#111', borderRadius: 4 }}>
            <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>Project Not Found</Typography>
            <Typography sx={{ color: '#666', mb: 3 }}>The project you're looking for doesn't exist or you don't have access to it.</Typography>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const isOwner = project.ownerId === user?.uid;

  return (
    <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <IconButton onClick={() => navigate('/dashboard')} sx={{ color: '#BB86FC' }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', flex: 1 }}>
                {project.name}
              </Typography>
              <Chip
                label={project.status}
                sx={{
                  bgcolor: `${getStatusColor(project.status)}20`,
                  color: getStatusColor(project.status),
                  fontWeight: 700,
                  textTransform: 'capitalize'
                }}
              />
              {isOwner && (
                <Tooltip title="Edit Project">
                  <IconButton sx={{ color: '#666', '&:hover': { color: '#BB86FC' } }}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PeopleIcon sx={{ color: '#BB86FC', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>Members</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{project.members?.length || 0}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ExtensionIcon sx={{ color: '#BB86FC', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>Components</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {project.data?.nodes?.length || 0}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <UpdateIcon sx={{ color: '#BB86FC', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>Last Modified</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                      {project.updatedAt?.toDate ? project.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => navigate(`/board?id=${project.id}`)}
                  sx={{ height: '100%' }}
                >
                  Open Editor
                </Button>
              </Grid>
            </Grid>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': { color: '#666', textTransform: 'none', fontWeight: 600 },
                '& .Mui-selected': { color: '#BB86FC' },
                '& .MuiTabs-indicator': { bgcolor: '#BB86FC' }
              }}
            >
              <Tab label="Overview" />
              <Tab label="Members" />
              <Tab label="Activity" />
              <Tab label="Settings" />
            </Tabs>
          </Box>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="lg">
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Description */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 4, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                  Description
                </Typography>
                <Typography sx={{ color: '#999', lineHeight: 1.7 }}>
                  {project.description || 'No description provided for this project yet.'}
                </Typography>
              </Paper>

              {/* Recent Activity */}
              <Paper sx={{ p: 4, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', mt: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
                  Recent Activity
                </Typography>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <TimelineIcon sx={{ fontSize: 48, color: '#333', mb: 2 }} />
                  <Typography sx={{ color: '#666' }}>No activity yet</Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Project Info */}
              <Paper sx={{ p: 3, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#555', mb: 2 }}>PROJECT INFO</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>Created</Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                      {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#555', display: 'block' }}>Owner</Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                      {memberProfiles.find(p => p.uid === project.ownerId)?.displayName || 'Unknown'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Quick Actions */}
              <Paper sx={{ p: 3, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="subtitle2" sx={{ color: '#555', mb: 2 }}>QUICK ACTIONS</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start' }}>
                    Duplicate Project
                  </Button>
                  <Button variant="outlined" fullWidth sx={{ justifyContent: 'flex-start' }}>
                    Export Data
                  </Button>
                  {isOwner && (
                    <Button variant="outlined" color="error" fullWidth sx={{ justifyContent: 'flex-start' }}>
                      Archive Project
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 4, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
              Project Members
            </Typography>
            <List>
              {project.members?.map((memberId) => {
                const profile = memberProfiles.find(p => p.uid === memberId);
                const isMemberOwner = memberId === project.ownerId;
                return (
                  <ListItem key={memberId} sx={{ px: 0, py: 2 }}>
                    <ListItemAvatar>
                      <Avatar src={profile?.photoURL} sx={{ bgcolor: isMemberOwner ? '#BB86FC' : '#333' }}>
                        {profile?.displayName?.[0] || profile?.email?.[0] || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                            {profile?.displayName || 'Unknown User'}
                          </Typography>
                          {isMemberOwner && (
                            <Chip label="Owner" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(187, 134, 252, 0.2)', color: '#BB86FC' }} />
                          )}
                        </Box>
                      }
                      secondary={profile?.email || memberId}
                      secondaryTypographyProps={{ sx: { color: '#666' } }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 4, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
              Activity Timeline
            </Typography>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TimelineIcon sx={{ fontSize: 64, color: '#222', mb: 2 }} />
              <Typography sx={{ color: '#666', mb: 1 }}>No activity to show</Typography>
              <Typography variant="caption" sx={{ color: '#555' }}>
                Activity tracking will be available soon
              </Typography>
            </Box>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Paper sx={{ p: 4, bgcolor: '#111', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
              Project Settings
            </Typography>

            {isOwner && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
                  Visibility
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={project.visibility === 'public'}
                      onChange={async (e) => {
                        const newVisibility = e.target.checked ? 'public' : 'private';
                        await firebaseProjectService.updateProject(project.id, { visibility: newVisibility });
                        setProject({ ...project, visibility: newVisibility });
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#BB86FC',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#BB86FC',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                        {project.visibility === 'public' ? 'Public Project' : 'Private Project'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {project.visibility === 'public'
                          ? 'Anyone can view this project'
                          : 'Only members can access this project'}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            )}

            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SettingsIcon sx={{ fontSize: 64, color: '#222', mb: 2 }} />
              <Typography sx={{ color: '#666' }}>Settings coming soon</Typography>
            </Box>
          </Paper>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default ProjectDetailPage;
