/* eslint-disable jsx-a11y/anchor-is-valid */
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import { auth } from '@components/infrastructure/firebase/init';
import { useAuth } from '@components/auth/AuthProvider';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const SignIn = (): JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const navigate = useNavigate();
  const { authService } = useAuth();

  const onSubmit = async (data: any) => {
    try {
      await authService.signInWithEmail(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login Error:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await authService.signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google Sign-In Error:', error);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await authService.signInWithGithub();
      navigate('/dashboard');
    } catch (error) {
      console.error('GitHub Sign-In Error:', error);
    }
  };

  return (
    <Box display="flex" height="100vh" bgcolor="black" color="white">
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <Typography variant="h4" fontWeight="bold">
          Offboard Stduio
        </Typography>
      </Box>
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <Paper
          elevation={6}
          sx={{
            padding: 4,
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 2,
          }}
        >
          <Container maxWidth="xs">
            <Typography variant="h5" gutterBottom>
              Login
            </Typography>
            <Typography variant="body2" color="gray" gutterBottom>
              Enter your email below to sign in with your account
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                margin="normal"
                InputProps={{ style: { color: 'white' } }}
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                margin="normal"
                InputProps={{ style: { color: 'white' } }}
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
              >
                Sign In with Email
              </Button>
              <Typography align="center" sx={{ my: 2, color: 'gray' }}>
                OR CONTINUE
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Button>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  bgcolor: '#DB4437',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
                onClick={handleGoogleSignIn}
              >
                <GoogleIcon /> Sign In with Google
              </Button>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  bgcolor: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
                onClick={handleGithubSignIn}
              >
                <GitHubIcon /> Sign In with GitHub
              </Button>
              <Typography
                variant="caption"
                display="block"
                align="center"
                color="gray"
                sx={{ mt: 2 }}
              >
                By clicking continue, you agree to our{' '}
                <a href="#" style={{ color: 'white' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: 'white' }}>
                  Privacy Policy
                </a>
                .
              </Typography>
            </form>
          </Container>
        </Paper>
      </Box>
    </Box>
  );
};
