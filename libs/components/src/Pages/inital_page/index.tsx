import { Box, Button, Container, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const WelcomePage = () => {
  const navigate = useNavigate(); // Sayfa yönlendirme için

  return (
    <Box
      sx={{
        height: '100vh', // Tam ekran
        overflow: 'hidden', // Scroll'u engelle
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          {/* Sol Kısım - Metinler */}
          <Box textAlign="left" fontStyle={'italic'} color={'white'}>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Welcome to a better way to build
            </Typography>
            <Typography variant="h6" color="gray" paragraph>
              Our platform helps teams build, deploy, and scale amazing products
              with unprecedented speed and efficiency.
            </Typography>
            <Box mt={3}>
              <Button
                variant="contained"
                color="primary"
                sx={{ mr: 2 }}
                onClick={() => navigate('/dashboard')}
              >
                Get Started →
              </Button>
              <Button variant="outlined" color="secondary">
                Learn More
              </Button>
            </Box>
          </Box>

          {/* Sağ Kısım - Görsel Alanı */}
          <Paper
            sx={{
              width: 400,
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.800',
              borderRadius: 3,
              boxShadow: 3,
            }}
          >
            <Typography variant="body1" color="gray">
              [Image Placeholder]
            </Typography>
          </Paper>
        </Box>

        {/* Login ve Register Butonları */}
        <Box textAlign="center" mt={4}>
          <Button
            variant="contained"
            color="secondary"
            sx={{ mx: 1 }}
            onClick={() => navigate('/signIn')}
          >
            Login
          </Button>
          <Button
            variant="outlined"
            color="primary"
            sx={{ mx: 1 }}
            onClick={() => navigate('/signUp')}
          >
            Register
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export const StudioApp = (): JSX.Element => {
  return <WelcomePage />;
};
