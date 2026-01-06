/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  createHashRouter,
  RouterProvider,
  DOMRouterOpts,
} from 'react-router-dom';

import {
  SignIn,
  SignUp,
  ErrorPage,
  DashboardPage,
  NotFound,
  BoardPage,
  ProfilePage,
  ProjectDetailPage,
} from '@pages';

import { AuthProvider, useAuth } from '@components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';

import './App.module.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider } from '@mui/material';
import { JSX } from 'react/jsx-runtime';

const queryClient = new QueryClient();

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});
// console.log('basename', basename);
// console.log('window.location.pathname', window.location.pathname);
// console.log('window.location.origin', window.location.origin);
// console.log('window.location.href', window.location.href);
// console.log('window.location.protocol', window.location.protocol);
// console.log('window.location.host', window.location.host);
// console.log('window.location.hostname', window.location.hostname);
// console.log('window.location.port', window.location.port);
// console.log('window.location.search', window.location.search);
// console.log('window.location.hash', window.location.hash);
// console.log('window.location', window.location);
// console.log('window', window);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;

  return <>{children}</>;
};

// createHashRouter solves basename issues in Electron
const router = createHashRouter(
  [
    {
      path: '/',
      element: <Navigate to="/dashboard" replace />
    },
    { path: '/signin', element: <SignIn /> },
    { path: '/signup', element: <SignUp /> },
    {
      path: '/dashboard',
      element: (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      )
    },
    {
      path: '/board',
      element: (
        <ProtectedRoute>
          <BoardPage />
        </ProtectedRoute>
      )
    },
    {
      path: '/project/:id',
      element: (
        <ProtectedRoute>
          <ProjectDetailPage />
        </ProtectedRoute>
      )
    },
    {
      path: '/user',
      element: (
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      )
    },
    { path: '*', element: <NotFound /> },
  ],
  {
    // basename: window.location.pathname || '/',
    // basename:window.location.protocol === 'file:' ? '/index.html' : '/',
    // basename: '/app',
  } as DOMRouterOpts
);

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={darkTheme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
