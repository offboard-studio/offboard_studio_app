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
import axios from 'axios';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

interface LoginResponse {
  token: string;
}

export const SignIn = (): JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const navigate = useNavigate();

  const onSubmit = async (data: unknown) => {
    try {
      const response = await axios.post<LoginResponse>(
        'https://your-api.com/login',
        data
      );
      console.log('Login Success:', response.data);

      // JWT Token'ı almak
      const { token } = response.data;

      // Token'ı localStorage'da saklamak
      localStorage.setItem('jwtToken', token);

      // Kullanıcıyı anasayfaya yönlendirmek (veya başka bir sayfaya)
      navigate('/dashboard'); // Örneğin dashboard'a yönlendirebilirsiniz
    } catch (error) {
      console.error('Login Error:', error);
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
                onClick={() =>
                  (window.location.href = 'https://your-api.com/auth/google')
                }
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
                onClick={() =>
                  (window.location.href = 'https://your-api.com/auth/github')
                }
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
