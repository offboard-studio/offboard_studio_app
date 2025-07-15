import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import { Email, Phone, Language, GitHub, Twitter } from '@mui/icons-material';

const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <div></div>
          {/* <Grid item>
            <Avatar sx={{ width: 80, height: 80 }} />
          </Grid>
          <Grid item xs>
            <Typography variant="h4">Jane Doe</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Senior Frontend Developer
            </Typography>
            <Typography variant="body2" color="textSecondary">
              San Francisco, CA
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="contained">Message</Button>
          </Grid>*/}
        </Grid>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Personal Information</Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Email />
            <Typography>jane.doe@example.com</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Phone />
            <Typography>+1 (555) 123-4567</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Language />
            <Typography>janedoe.dev</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Twitter />
            <Typography>@janedoe</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <GitHub />
            <Typography>janedoe</Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">About Me</Typography>
          <Typography variant="body2" mt={1}>
            Passionate frontend developer with 5+ years of experience building
            responsive and accessible web applications. Specialized in React,
            TypeScript, and modern CSS frameworks.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Recent Experience</Typography>
          <Typography variant="body2" mt={1}>
            Senior Frontend Developer at Tech Solutions Inc.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Lead frontend development for multiple client projects. Implemented
            design systems and component libraries that improved development
            efficiency by 40%.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Skills</Typography>
          <Box mt={1} display="flex" gap={1} flexWrap="wrap">
            {[
              'React',
              'TypeScript',
              'JavaScript',
              'HTML/CSS',
              'Material UI',
            ].map((skill) => (
              <Chip key={skill} label={skill} />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProfilePage;
