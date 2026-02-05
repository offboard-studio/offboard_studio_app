import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
  Avatar,
  IconButton,
  Slide,
  SlideProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import { tokens } from '../../theme';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'collaboration';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  user?: {
    name: string;
    photoURL?: string;
    color?: string;
  };
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showCollaboration: (message: string, user: NotificationData['user']) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    case 'collaboration':
      return <PersonAddIcon />;
    default:
      return <InfoIcon />;
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return tokens.colors.status.success;
    case 'error':
      return tokens.colors.status.error;
    case 'warning':
      return tokens.colors.status.warning;
    case 'info':
      return tokens.colors.status.info;
    case 'collaboration':
      return tokens.colors.primary.main;
    default:
      return tokens.colors.status.info;
  }
};

interface NotificationItemProps {
  notification: NotificationData;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const isCollaboration = notification.type === 'collaboration';
  const color = getNotificationColor(notification.type);

  return (
    <Alert
      severity={notification.type === 'collaboration' ? 'info' : notification.type}
      icon={
        isCollaboration && notification.user ? (
          <Avatar
            src={notification.user.photoURL}
            sx={{
              width: 32,
              height: 32,
              bgcolor: notification.user.color || tokens.colors.primary.main,
            }}
          >
            {notification.user.name?.[0]?.toUpperCase()}
          </Avatar>
        ) : (
          getNotificationIcon(notification.type)
        )
      }
      action={
        <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
      sx={{
        bgcolor: tokens.colors.background.elevated,
        border: `1px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        color: tokens.colors.text.primary,
        alignItems: 'flex-start',
        minWidth: 320,
        maxWidth: 420,
        boxShadow: tokens.shadows.lg,
        '& .MuiAlert-icon': {
          color: color,
          opacity: 1,
          mr: 1.5,
          mt: 0.25,
        },
        '& .MuiAlert-message': {
          py: 0,
        },
      }}
    >
      {notification.title && (
        <AlertTitle sx={{ fontWeight: 600, mb: 0.25, color: tokens.colors.text.primary }}>
          {notification.title}
        </AlertTitle>
      )}
      <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
        {notification.message}
      </Typography>
      {notification.action && (
        <Box
          component="button"
          onClick={notification.action.onClick}
          sx={{
            mt: 1,
            px: 2,
            py: 0.5,
            bgcolor: `${color}20`,
            color: color,
            border: 'none',
            borderRadius: tokens.borderRadius.sm,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.8125rem',
            transition: tokens.transitions.fast,
            '&:hover': {
              bgcolor: `${color}30`,
            },
          }}
        >
          {notification.action.label}
        </Box>
      )}
    </Alert>
  );
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationData = { ...notification, id };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto dismiss
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showNotification({ type: 'success', message, title });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string) => {
    showNotification({ type: 'error', message, title, duration: 8000 });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    showNotification({ type: 'warning', message, title });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    showNotification({ type: 'info', message, title });
  }, [showNotification]);

  const showCollaboration = useCallback((message: string, user: NotificationData['user']) => {
    showNotification({ type: 'collaboration', message, user, duration: 4000 });
  }, [showNotification]);

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCollaboration,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification Stack */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {notifications.map((notification) => (
          <Slide key={notification.id} direction="left" in mountOnEnter unmountOnExit>
            <Box>
              <NotificationItem
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            </Box>
          </Slide>
        ))}
      </Box>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
