import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Email,
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@components/auth/AuthProvider';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh', py: 4, px: 2 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{ color: '#BB86FC', border: '1px solid rgba(187, 134, 252, 0.2)' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
            My Profile
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Main Profile Info */}
          <Grid item xs={12} md={4}>
            <Paper sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: '#111',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.05)',
              height: '100%'
            }}>
              <Avatar
                src={user?.photoURL || ''}
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '3rem',
                  bgcolor: '#BB86FC',
                  border: '4px solid #1a1a1a',
                  boxShadow: '0 0 20px rgba(187, 134, 252, 0.3)'
                }}
              >
                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                {user?.displayName || 'Unknown User'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                Robotics Engineer
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Tooltip title="Member since Jan 2026">
                  <IconButton size="small" sx={{ color: '#BB86FC' }}><SecurityIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Verified Profile">
                  <IconButton size="small" sx={{ color: '#03DAC6' }}><PersonIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Grid>

          {/* Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{
              p: 4,
              bgcolor: '#111',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.05)',
              minHeight: '100%'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>
                Account Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#555', display: 'block', mb: 0.5 }}>Full Name</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PersonIcon sx={{ color: '#BB86FC', fontSize: 20 }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>{user?.displayName || 'Not set'}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#555', display: 'block', mb: 0.5 }}>Email Address</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Email sx={{ color: '#BB86FC', fontSize: 20 }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>{user?.email || 'Not set'}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: '#555', display: 'block', mb: 0.5 }}>Account Status</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <UpdateIcon sx={{ color: '#BB86FC', fontSize: 20 }} />
                    <Typography sx={{ color: '#fff', fontWeight: 500 }}>Active Member</Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.05)' }} />

              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
                About Studio
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                You are a part of the Offboard Studio collaboration network.
                Your profile is visible to other members when they search for you to invite you to robotics projects.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ProfilePage;
