import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Button,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
  Badge,
  Alert,
  Collapse,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import CircleIcon from '@mui/icons-material/Circle';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PresenceManager, { UserPresence, PresenceState } from '../../core/presence/PresenceManager';
import { tokens } from '../../theme';

const StyledBadge = styled(Badge)<{ statuscolor: string }>(({ statuscolor }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: statuscolor,
    color: statuscolor,
    boxShadow: `0 0 0 2px ${tokens.colors.background.elevated}`,
  },
}));

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  odcId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: MemberRole;
  joinedAt?: Date;
}

interface CollaborationPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentUserId: string;
  members: ProjectMember[];
  allUsers: Array<{ odcId: string; displayName: string; email: string; photoURL?: string }>;
  onAddMember: (email: string, role: MemberRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onChangeRole?: (userId: string, role: MemberRole) => Promise<void>;
  isOwner: boolean;
}

const getRoleIcon = (role: MemberRole) => {
  switch (role) {
    case 'owner':
      return <AdminPanelSettingsIcon sx={{ fontSize: 14 }} />;
    case 'editor':
      return <EditIcon sx={{ fontSize: 14 }} />;
    case 'viewer':
      return <VisibilityIcon sx={{ fontSize: 14 }} />;
  }
};

const getRoleColor = (role: MemberRole): string => {
  switch (role) {
    case 'owner':
      return tokens.colors.accent.purple;
    case 'editor':
      return tokens.colors.primary.main;
    case 'viewer':
      return tokens.colors.text.tertiary;
  }
};

const getStatusColor = (status?: UserPresence['status']): string => {
  switch (status) {
    case 'active':
      return tokens.colors.status.success;
    case 'idle':
      return tokens.colors.status.warning;
    case 'away':
      return tokens.colors.text.disabled;
    default:
      return 'transparent';
  }
};

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  open,
  onClose,
  projectId,
  currentUserId,
  members,
  allUsers,
  onAddMember,
  onRemoveMember,
  onChangeRole,
  isOwner,
}) => {
  const [presenceState, setPresenceState] = useState<PresenceState>({
    users: new Map(),
    currentUser: null,
  });
  const [selectedUser, setSelectedUser] = useState<typeof allUsers[0] | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const presenceManager = PresenceManager.getInstance();
    const unsubscribe = presenceManager.subscribe(setPresenceState);
    return () => unsubscribe();
  }, []);

  const handleInvite = async () => {
    if (!selectedUser) return;
    setIsInviting(true);
    setError(null);

    try {
      await onAddMember(selectedUser.email, selectedRole);
      setSelectedUser(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/#/board?id=${projectId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOnlineStatus = (userId: string): UserPresence | undefined => {
    return Array.from(presenceState.users.values()).find((u) => u.odcId === userId);
  };

  // Filter out already added members
  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.email === u.email)
  );

  const onlineCount = Array.from(presenceState.users.values()).filter(
    (u) => members.some((m) => m.odcId === u.odcId)
  ).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          bgcolor: tokens.colors.background.elevated,
          borderLeft: `1px solid ${tokens.colors.border.default}`,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${tokens.colors.border.default}`,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
            Collaboration
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
            {members.length} members • {onlineCount} online
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Share Link */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.colors.border.default}` }}>
        <Typography
          variant="subtitle2"
          sx={{ color: tokens.colors.text.secondary, mb: 1, fontWeight: 600 }}
        >
          Share Link
        </Typography>
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            bgcolor: tokens.colors.surface[1],
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.borderRadius.md,
          }}
        >
          <LinkIcon sx={{ color: tokens.colors.text.tertiary, mr: 1 }} />
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              color: tokens.colors.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {`${window.location.origin}/#/board?id=${projectId.slice(0, 8)}...`}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
            <IconButton size="small" onClick={handleCopyLink}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 18, color: tokens.colors.status.success }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {/* Invite Section */}
      {isOwner && (
        <Box sx={{ p: 2, borderBottom: `1px solid ${tokens.colors.border.default}` }}>
          <Typography
            variant="subtitle2"
            sx={{ color: tokens.colors.text.secondary, mb: 1.5, fontWeight: 600 }}
          >
            Invite People
          </Typography>

          <Autocomplete
            options={availableUsers}
            value={selectedUser}
            onChange={(_, newValue) => {
              setSelectedUser(newValue);
              setError(null);
            }}
            getOptionLabel={(option) => option.displayName || option.email}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={option.photoURL}
                  sx={{ width: 32, height: 32, bgcolor: tokens.colors.primary.main }}
                >
                  {option.displayName?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ color: tokens.colors.text.primary }}>
                    {option.displayName || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                    {option.email}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by name or email..."
                size="small"
                sx={{ mb: 1.5 }}
              />
            )}
            PaperComponent={({ children }) => (
              <Paper sx={{ bgcolor: tokens.colors.surface[2], border: `1px solid ${tokens.colors.border.default}` }}>
                {children}
              </Paper>
            )}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            {(['editor', 'viewer'] as MemberRole[]).map((role) => (
              <Chip
                key={role}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                icon={getRoleIcon(role)}
                onClick={() => setSelectedRole(role)}
                variant={selectedRole === role ? 'filled' : 'outlined'}
                sx={{
                  borderColor: selectedRole === role ? getRoleColor(role) : tokens.colors.border.default,
                  bgcolor: selectedRole === role ? `${getRoleColor(role)}20` : 'transparent',
                  color: selectedRole === role ? getRoleColor(role) : tokens.colors.text.secondary,
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            ))}
          </Box>

          <Collapse in={!!error}>
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          </Collapse>

          <Button
            fullWidth
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleInvite}
            disabled={!selectedUser || isInviting}
            sx={{
              bgcolor: tokens.colors.primary.main,
              '&:hover': { bgcolor: tokens.colors.primary.dark },
            }}
          >
            {isInviting ? 'Inviting...' : 'Send Invite'}
          </Button>
        </Box>
      )}

      {/* Members List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography
          variant="subtitle2"
          sx={{ color: tokens.colors.text.secondary, px: 2, pt: 2, pb: 1, fontWeight: 600 }}
        >
          Members
        </Typography>

        <List sx={{ py: 0 }}>
          {members.map((member) => {
            const onlineStatus = getOnlineStatus(member.odcId);
            const isCurrentUser = member.odcId === currentUserId;
            const canRemove = isOwner && member.role !== 'owner' && !isCurrentUser;

            return (
              <ListItem
                key={member.odcId}
                sx={{
                  px: 2,
                  py: 1,
                  '&:hover': { bgcolor: tokens.colors.background.hover },
                }}
                secondaryAction={
                  canRemove && (
                    <Tooltip title="Remove member">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onRemoveMember(member.odcId)}
                        sx={{ color: tokens.colors.status.error }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <ListItemAvatar>
                  <StyledBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    statuscolor={getStatusColor(onlineStatus?.status)}
                    invisible={!onlineStatus}
                  >
                    <Avatar
                      src={member.photoURL || undefined}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: onlineStatus?.color || tokens.colors.surface[3],
                      }}
                    >
                      {member.displayName?.[0]?.toUpperCase()}
                    </Avatar>
                  </StyledBadge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: tokens.colors.text.primary }}
                      >
                        {member.displayName}
                      </Typography>
                      {isCurrentUser && (
                        <Chip
                          label="You"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: tokens.colors.surface[3],
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Chip
                        icon={getRoleIcon(member.role)}
                        label={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.625rem',
                          bgcolor: `${getRoleColor(member.role)}15`,
                          color: getRoleColor(member.role),
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                      {onlineStatus && (
                        <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                          • {onlineStatus.status}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default CollaborationPanel;
