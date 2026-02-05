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
import { ErrorBoundary, NotificationProvider, theme, QUERY_STALE_TIME_MS, QUERY_RETRY_COUNT } from '@components';
import { Navigate } from 'react-router-dom';

import './App.module.scss';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { JSX } from 'react/jsx-runtime';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY_COUNT,
      staleTime: QUERY_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  },
});

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

const handleError = (error: Error, errorInfo: React.ErrorInfo): void => {
  // Log to external service in production (e.g., Sentry)
  console.error('Application Error:', error);
  console.error('Error Info:', errorInfo);
};

const App = (): JSX.Element => (
  <ErrorBoundary onError={handleError}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
