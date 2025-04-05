import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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

// Update the basename to match the correct path
const router = createBrowserRouter(
  [
    { path: '/', element: <BoardPage />, errorElement: <ErrorPage /> },
    { path: '/signin', element: <SignIn /> },
    { path: '/signup', element: <SignUp /> },
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '*', element: <NotFound /> },
  ],
  { basename: '/index.html' }
);

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={darkTheme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
