import React, { useEffect, useState } from 'react';
import {
  Box,
  Avatar,
  AvatarGroup,
  Tooltip,
  Badge,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import CircleIcon from '@mui/icons-material/Circle';
import PresenceManager, { UserPresence, PresenceState } from '../../core/presence/PresenceManager';
import { tokens } from '../../theme';

const StyledBadge = styled(Badge)<{ statuscolor: string }>(({ statuscolor }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: statuscolor,
    color: statuscolor,
    boxShadow: `0 0 0 2px ${tokens.colors.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const getStatusColor = (status: UserPresence['status']): string => {
  switch (status) {
    case 'active':
      return tokens.colors.status.success;
    case 'idle':
      return tokens.colors.status.warning;
    case 'away':
      return tokens.colors.text.disabled;
    default:
      return tokens.colors.text.disabled;
  }
};

const getStatusLabel = (status: UserPresence['status']): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'idle':
      return 'Idle';
    case 'away':
      return 'Away';
    default:
      return 'Unknown';
  }
};

const getViewLabel = (view: UserPresence['currentView']): string => {
  switch (view) {
    case 'board':
      return 'Editing board';
    case 'settings':
      return 'In settings';
    case 'ai-config':
      return 'Configuring AI';
    case 'deploy':
      return 'Deploying';
    default:
      return '';
  }
};

interface ActiveUsersProps {
  maxVisible?: number;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ActiveUsers: React.FC<ActiveUsersProps> = ({
  maxVisible = 4,
  showCount = true,
  size = 'medium',
}) => {
  const [presenceState, setPresenceState] = useState<PresenceState>({
    users: new Map(),
    currentUser: null,
  });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const presenceManager = PresenceManager.getInstance();
    const unsubscribe = presenceManager.subscribe(setPresenceState);
    return () => unsubscribe();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const activeUsers = Array.from(presenceState.users.values());
  const otherUsers = activeUsers.filter(
    (user) => user.odcId !== presenceState.currentUser?.odcId
  );

  const avatarSize = size === 'small' ? 28 : size === 'large' ? 40 : 32;
  const badgeSize = size === 'small' ? 8 : size === 'large' ? 12 : 10;

  if (otherUsers.length === 0 && !showCount) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: tokens.borderRadius.md,
          transition: tokens.transitions.fast,
          '&:hover': {
            backgroundColor: tokens.colors.background.hover,
          },
        }}
        onClick={handleClick}
      >
        {otherUsers.length > 0 ? (
          <AvatarGroup
            max={maxVisible}
            sx={{
              '& .MuiAvatar-root': {
                width: avatarSize,
                height: avatarSize,
                fontSize: avatarSize * 0.4,
                border: `2px solid ${tokens.colors.background.paper}`,
              },
            }}
          >
            {otherUsers.map((user) => (
              <Tooltip key={user.odcId} title={`${user.displayName} - ${getStatusLabel(user.status)}`}>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  statuscolor={getStatusColor(user.status)}
                >
                  <Avatar
                    src={user.photoURL || undefined}
                    sx={{ bgcolor: user.color }}
                  >
                    {user.displayName?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                </StyledBadge>
              </Tooltip>
            ))}
          </AvatarGroup>
        ) : (
          <PeopleIcon sx={{ color: tokens.colors.text.tertiary, fontSize: 20 }} />
        )}

        {showCount && (
          <Typography
            variant="body2"
            sx={{
              color: tokens.colors.text.secondary,
              fontWeight: 500,
              fontSize: '0.8125rem',
            }}
          >
            {activeUsers.length} online
          </Typography>
        )}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            bgcolor: tokens.colors.background.elevated,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.borderRadius.lg,
            mt: 1,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.colors.border.default}` }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
            Active Collaborators
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
            {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} in this project
          </Typography>
        </Box>

        <List sx={{ py: 1 }}>
          {/* Current user first */}
          {presenceState.currentUser && (
            <ListItem
              sx={{
                bgcolor: tokens.colors.background.active,
                borderRadius: tokens.borderRadius.md,
                mx: 1,
                width: 'auto',
              }}
            >
              <ListItemAvatar>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  statuscolor={getStatusColor(presenceState.currentUser.status)}
                >
                  <Avatar
                    src={presenceState.currentUser.photoURL || undefined}
                    sx={{ bgcolor: presenceState.currentUser.color }}
                  >
                    {presenceState.currentUser.displayName?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                </StyledBadge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                      {presenceState.currentUser.displayName}
                    </Typography>
                    <Chip
                      label="You"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.625rem',
                        bgcolor: tokens.colors.primary.main,
                        color: tokens.colors.primary.contrast,
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                    {getViewLabel(presenceState.currentUser.currentView)}
                  </Typography>
                }
              />
            </ListItem>
          )}

          {/* Other users */}
          {otherUsers.map((user) => (
            <ListItem key={user.odcId} sx={{ px: 2 }}>
              <ListItemAvatar>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  statuscolor={getStatusColor(user.status)}
                >
                  <Avatar src={user.photoURL || undefined} sx={{ bgcolor: user.color }}>
                    {user.displayName?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                </StyledBadge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>
                    {user.displayName}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CircleIcon sx={{ fontSize: 6, color: getStatusColor(user.status) }} />
                    <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                      {getStatusLabel(user.status)} • {getViewLabel(user.currentView)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}

          {otherUsers.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{ color: tokens.colors.text.tertiary, textAlign: 'center', py: 2 }}
                  >
                    No other collaborators online
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Popover>
    </>
  );
};

export default ActiveUsers;
