import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  Grid,
  Paper,
  Divider,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';

import { ListItem } from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ExtensionIcon from '@mui/icons-material/Extension';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { createTheme, ThemeProvider } from '@mui/material/styles';

// Sabit Drawer genişliği
const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#BB86FC',
    },
    secondary: {
      main: '#03DAC6',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

export const DashboardPage = (): JSX.Element => {
  // Yeni proje ve component oluşturma butonları için örnek fonksiyonlar

  const navigate = useNavigate();

  const handleNewProject = () => {
    navigate('/board', { state: {} });
    // toast.info('Created a new Project', {
    //   position: 'bottom-right',
    // });
  };

  const handleNewComponent = () => {
    navigate('/component-creator', { state: {} });
    // toast.info('Created a new Component', {
    //   position: 'bottom-right',
    // });
  };

  // Örnek veriler
  const stats = [
    { title: 'Total Projects', value: 12, change: '+2 this month' },
    { title: 'Total Components', value: 36, change: '+4 this month' },
    { title: 'In Progress', value: 5, change: '-1 this month' },
  ];

  const recentProjects = [
    {
      name: 'Ecommerce Platform',
      components: 8,
      status: 'Completed',
      updated: '2 hours ago',
    },
    {
      name: 'CRM Dashboard',
      components: 12,
      status: 'In Progress',
      updated: '5 hours ago',
    },
    {
      name: 'Mobile Application',
      components: 6,
      status: 'Review',
      updated: '1 day ago',
    },
  ];

  const recentComponents = [
    { name: 'Login Form', status: 'Reusable' },
    { name: 'Data Table', status: 'New' },
    { name: 'Chart Component', status: 'In Progress' },
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />

        {/* Üst Navigation Bar */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Project Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <div
                onClick={() => {
                  handleNewProject();
                }}
              >
                <Paper
                  sx={{
                    p: 1,
                    mb: 1,
                    boxShadow: 2,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <>
                    <AddCircleOutlineIcon />
                    <div style={{ width: 8 }} />
                    New Project
                  </>
                </Paper>
              </div>
              <Avatar alt="User Avatar" />
              <IconButton>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(0,0,0,0.12)',
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              <ListItem component="button">
                <ListItemIcon>
                  <DashboardIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItem>
              <ListItem component="button">
                <ListItemIcon>
                  <ListAltIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Projects" />
              </ListItem>
              <ListItem component="button">
                <ListItemIcon>
                  <ExtensionIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Components" />
              </ListItem>
              <ListItem component="button">
                <ListItemIcon>
                  <AssessmentIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Analytics" />
              </ListItem>
            </List>
          </Box>
        </Drawer>

        {/* İçerik */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            bgcolor: 'background.default',
            minHeight: '100vh',
          }}
        >
          <Toolbar />
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleNewProject}
              sx={{ textTransform: 'none' }}
            >
              New Project
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ExtensionIcon />}
              onClick={handleNewComponent}
              sx={{ textTransform: 'none' }}
            >
              New Component
            </Button>
          </Box>

          {/* Üstte İstatistik Kartları */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {stats.map((item, index) => (
              <div></div>
              // <Grid component="div" item xs={12} md={4} key={index}>
              //   <Card
              //     sx={{
              //       height: '100%',
              //       boxShadow: 2,
              //     }}
              //   >
              //     <CardContent>
              //       <Typography variant="subtitle2" color="text.secondary">
              //         {item.title}
              //       </Typography>
              //       <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              //         {item.value}
              //       </Typography>
              //       <Typography variant="caption" color="success.main">
              //         {item.change}
              //       </Typography>
              //     </CardContent>
              //   </Card>
              // </Grid>
            ))}
          </Grid>

          {/* Son Projeler */}
          <Paper sx={{ p: 2, mb: 3, boxShadow: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Projects
              </Typography>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer' }}
              >
                View all
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {recentProjects.map((project, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{project.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {project.components} components
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    Status: <strong>{project.status}</strong>
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    {project.updated}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>

          {/* Son Componentler */}
          <Paper sx={{ p: 2, boxShadow: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Components
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ExtensionIcon />}
                onClick={handleNewComponent}
                sx={{ textTransform: 'none' }}
              >
                New Component
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {recentComponents.map((component, index) => (
                <div></div>
                // <Grid item xs={12} md={4} key={index}>
                //   <Card sx={{ boxShadow: 2 }}>
                //     <CardContent>
                //       <Typography variant="subtitle1">{component.name}</Typography>
                //       <Typography variant="caption" color="text.secondary">
                //         Status: {component.status}
                //       </Typography>
                //     </CardContent>
                //   </Card>
                // </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
