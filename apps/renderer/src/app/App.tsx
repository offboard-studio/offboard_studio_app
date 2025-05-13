/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { createHashRouter, RouterProvider,DOMRouterOpts } from 'react-router-dom';
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
import { basename } from 'path';

const queryClient = new QueryClient();

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});
// console.log('basename', basename);
console.log('window.location.pathname', window.location.pathname);
console.log('window.location.origin', window.location.origin);
console.log('window.location.href', window.location.href);
console.log('window.location.protocol', window.location.protocol);
console.log('window.location.host', window.location.host);
console.log('window.location.hostname', window.location.hostname);
console.log('window.location.port', window.location.port);
console.log('window.location.search', window.location.search);
console.log('window.location.hash', window.location.hash);
console.log('window.location', window.location);
console.log('window', window);

// createHashRouter solves basename issues in Electron
const router = createHashRouter([
  { path: '/', element: <BoardPage />, errorElement: <ErrorPage /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },  
  { path: '/dashboard', element: <DashboardPage /> },
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
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
