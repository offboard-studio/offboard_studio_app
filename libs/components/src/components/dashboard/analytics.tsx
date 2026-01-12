import React from 'react';
import { Box, Card, CardContent, Grid, Typography, LinearProgress, Paper } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import GitHubIcon from '@mui/icons-material/GitHub';
import { IProject } from '@components/core/interfaces/project.service.interface';

interface AnalyticsDashboardProps {
  projects: IProject[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projects }) => {
  // Mock data calculations - replace with real stats when available
  const totalViews = projects.reduce((acc, p) => acc + (p.stats?.usageCount || 0), 0);
  const totalStars = projects.reduce((acc, p) => acc + (p.stats?.stars || 0), 0);
  const totalForks = projects.reduce((acc, p) => acc + (p.stats?.forks || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#fff' }}>
        Project Analytics
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="#aaa" variant="subtitle2">Total Views</Typography>
                <VisibilityIcon sx={{ color: '#03DAC6' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{totalViews}</Typography>
              <Typography variant="caption" color="#03DAC6">+12% from last week</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="#aaa" variant="subtitle2">Total Stars</Typography>
                <StarIcon sx={{ color: '#fdd835' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{totalStars}</Typography>
              <Typography variant="caption" color="#aaa">Across {projects.length} projects</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="#aaa" variant="subtitle2">Forks</Typography>
                <GitHubIcon sx={{ color: '#BB86FC' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{totalForks}</Typography>
              <Typography variant="caption" color="#BB86FC">High engagement</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="#aaa" variant="subtitle2">Active Projects</Typography>
                <TimelineIcon sx={{ color: '#cf6679' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{activeProjects}</Typography>
              <Typography variant="caption" color="#aaa">Out of {projects.length} total</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Project Performance List */}
      <Paper sx={{ p: 3, bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>Top Performing Projects</Typography>
        {projects.slice(0, 5).map((project, index) => (
          <Box key={project.id} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">{project.name}</Typography>
              <Typography variant="body2" color="#aaa">{(project.stats?.usageCount || 0) + (index * 50)} views</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(((project.stats?.usageCount || 0) + (index * 50)) / 10, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: '#333',
                '& .MuiLinearProgress-bar': {
                  bgcolor: index % 2 === 0 ? '#BB86FC' : '#03DAC6'
                }
              }}
            />
          </Box>
        ))}
        {projects.length === 0 && (
          <Typography color="#aaa">No projects to display analytics for.</Typography>
        )}
      </Paper>
    </Box>
  );
};
