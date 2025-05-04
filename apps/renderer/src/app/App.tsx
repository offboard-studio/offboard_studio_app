import { createHashRouter, RouterProvider } from 'react-router-dom';
import {
  SignIn,
  SignUp,
  ErrorPage,
  DashboardPage,
  NotFound,
  BoardPage,
} from '@components';
import './App.module.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider } from '@mui/material';

const queryClient = new QueryClient();

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});

// createHashRouter solves basename issues in Electron
const router = createHashRouter([
  { path: '/', element: <BoardPage />, errorElement: <ErrorPage /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '*', element: <NotFound /> },
]);

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
