import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {
  SignIn,
  SignUp,
  ErrorPage,
  DashboardPage,
  NotFound,
  HomePage,
  StudioApp,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const router = createBrowserRouter(
  [
    { path: '/', element: <StudioApp />, errorElement: <ErrorPage /> },
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

// import { HashRouter as Router, Routes, Route } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { createTheme, ThemeProvider } from '@mui/material';

// import {
//   SignIn,
//   SignUp,
//   DashboardPage,
//   NotFound,
//   HomePage,
// } from '@components';

// import './App.module.scss';

// const queryClient = new QueryClient();

// const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//     primary: { main: '#90caf9' },
//     secondary: { main: '#f48fb1' },
//   },
// });

// const App = (): JSX.Element => (
//   <QueryClientProvider client={queryClient}>
//     <ThemeProvider theme={darkTheme}>
//       <Router>
//         <Routes>
//           <Route path="/" element={<HomePage />} />
//           <Route path="/signin" element={<SignIn />} />
//           <Route path="/signup" element={<SignUp />} />
//           <Route path="/dashboard" element={<DashboardPage />} />
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </Router>
//     </ThemeProvider>
//   </QueryClientProvider>
// );

// export default App;

// import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// import {
//   SignIn,
//   SignUp,
//   ErrorPage,
//   DashboardPage,
//   NotFound,
//   HomePage,
// } from '@components';
// import './App.module.scss';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { createTheme, ThemeProvider } from '@mui/material';

// const queryClient = new QueryClient();

// const darkTheme = createTheme({
//   palette: {
//     mode: 'dark',
//     primary: { main: '#90caf9' },
//     secondary: { main: '#f48fb1' },
//   },
// });

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const router = createBrowserRouter(
//   [
//     { path: '/', element: <HomePage />, errorElement: <ErrorPage /> },
//     { path: '/signin', element: <SignIn /> },
//     { path: '/signup', element: <SignUp /> },
//     { path: '/dashboard', element: <DashboardPage /> },
//     { path: '*', element: <NotFound /> },
//   ],
//   { basename: '/' }
// );

// const App = (): JSX.Element => (
//   <QueryClientProvider client={queryClient}>
//     <ThemeProvider theme={darkTheme}>
//       <RouterProvider router={router} />
//     </ThemeProvider>
//   </QueryClientProvider>
// );

// export default App;
