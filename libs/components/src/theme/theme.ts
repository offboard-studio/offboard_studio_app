import { createTheme, ThemeOptions } from '@mui/material/styles';

// Design Tokens
export const tokens = {
  colors: {
    // Primary palette
    primary: {
      main: '#6366F1', // Indigo
      light: '#818CF8',
      dark: '#4F46E5',
      contrast: '#FFFFFF',
    },
    // Secondary palette
    secondary: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
      contrast: '#FFFFFF',
    },
    // Accent colors
    accent: {
      purple: '#8B5CF6',
      pink: '#EC4899',
      cyan: '#06B6D4',
      orange: '#F97316',
      yellow: '#EAB308',
    },
    // Background colors
    background: {
      default: '#0A0A0F',
      paper: '#12121A',
      elevated: '#1A1A24',
      hover: '#22222E',
      active: '#2A2A38',
    },
    // Surface colors
    surface: {
      1: '#16161F',
      2: '#1E1E28',
      3: '#262632',
      4: '#2E2E3C',
    },
    // Text colors
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      disabled: '#475569',
    },
    // Border colors
    border: {
      default: 'rgba(148, 163, 184, 0.1)',
      hover: 'rgba(148, 163, 184, 0.2)',
      active: 'rgba(99, 102, 241, 0.5)',
    },
    // Status colors
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    // Collaboration colors (for user cursors)
    collaboration: {
      user1: '#6366F1',
      user2: '#EC4899',
      user3: '#10B981',
      user4: '#F97316',
      user5: '#06B6D4',
      user6: '#8B5CF6',
      user7: '#EAB308',
      user8: '#EF4444',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
    glow: {
      primary: '0 0 20px rgba(99, 102, 241, 0.3)',
      success: '0 0 20px rgba(16, 185, 129, 0.3)',
      error: '0 0 20px rgba(239, 68, 68, 0.3)',
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Fira Code", monospace',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Material-UI Theme
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.colors.primary.main,
      light: tokens.colors.primary.light,
      dark: tokens.colors.primary.dark,
      contrastText: tokens.colors.primary.contrast,
    },
    secondary: {
      main: tokens.colors.secondary.main,
      light: tokens.colors.secondary.light,
      dark: tokens.colors.secondary.dark,
      contrastText: tokens.colors.secondary.contrast,
    },
    error: {
      main: tokens.colors.status.error,
    },
    warning: {
      main: tokens.colors.status.warning,
    },
    info: {
      main: tokens.colors.status.info,
    },
    success: {
      main: tokens.colors.status.success,
    },
    background: {
      default: tokens.colors.background.default,
      paper: tokens.colors.background.paper,
    },
    text: {
      primary: tokens.colors.text.primary,
      secondary: tokens.colors.text.secondary,
      disabled: tokens.colors.text.disabled,
    },
    divider: tokens.colors.border.default,
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: tokens.colors.text.tertiary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: tokens.borderRadius.md,
  },
  shadows: [
    'none',
    tokens.shadows.sm,
    tokens.shadows.sm,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.md,
    tokens.shadows.lg,
    tokens.shadows.lg,
    tokens.shadows.lg,
    tokens.shadows.lg,
    tokens.shadows.lg,
    tokens.shadows.lg,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
    tokens.shadows.xl,
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.colors.background.default,
          scrollbarColor: `${tokens.colors.surface[3]} ${tokens.colors.background.default}`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: tokens.colors.background.default,
          },
          '&::-webkit-scrollbar-thumb': {
            background: tokens.colors.surface[3],
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: tokens.colors.surface[4],
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.borderRadius.md,
          padding: '10px 20px',
          fontWeight: 500,
          transition: tokens.transitions.fast,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: tokens.shadows.md,
          },
        },
        outlined: {
          borderColor: tokens.colors.border.hover,
          '&:hover': {
            borderColor: tokens.colors.primary.main,
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.colors.background.paper,
          borderRadius: tokens.borderRadius.lg,
          border: `1px solid ${tokens.colors.border.default}`,
          boxShadow: 'none',
          transition: tokens.transitions.normal,
          '&:hover': {
            borderColor: tokens.colors.border.hover,
            boxShadow: tokens.shadows.md,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.colors.background.elevated,
          borderRadius: tokens.borderRadius.xl,
          border: `1px solid ${tokens.colors.border.default}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.borderRadius.md,
            backgroundColor: tokens.colors.surface[1],
            '& fieldset': {
              borderColor: tokens.colors.border.default,
            },
            '&:hover fieldset': {
              borderColor: tokens.colors.border.hover,
            },
            '&.Mui-focused fieldset': {
              borderColor: tokens.colors.primary.main,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.borderRadius.sm,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: tokens.colors.surface[2],
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.colors.surface[3],
          borderRadius: tokens.borderRadius.sm,
          fontSize: '0.75rem',
          padding: '6px 12px',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.colors.primary.main,
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.borderRadius.md,
          transition: tokens.transitions.fast,
          '&:hover': {
            backgroundColor: tokens.colors.background.hover,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.borderRadius.md,
          '&:hover': {
            backgroundColor: tokens.colors.background.hover,
          },
          '&.Mui-selected': {
            backgroundColor: tokens.colors.background.active,
            '&:hover': {
              backgroundColor: tokens.colors.background.active,
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);

// Export helper functions
export const getCollaborationColor = (index: number): string => {
  const colors = Object.values(tokens.colors.collaboration);
  return colors[index % colors.length];
};

export const getUserColor = (userId: string): string => {
  // Generate consistent color based on userId hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return getCollaborationColor(Math.abs(hash));
};

export default theme;
