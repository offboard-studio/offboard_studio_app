import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { tokens } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';
export type ProjectVisibility = 'public' | 'private';

export interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  image?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  updatedAt: Date;
  members?: Array<{ id: string; name: string; photoURL?: string; color?: string }>;
  isOwner?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
}

const getStatusConfig = (status: ProjectStatus) => {
  switch (status) {
    case 'active':
      return { label: 'Active', color: tokens.colors.status.success, bgcolor: `${tokens.colors.status.success}20` };
    case 'completed':
      return { label: 'Completed', color: tokens.colors.primary.main, bgcolor: `${tokens.colors.primary.main}20` };
    case 'archived':
      return { label: 'Archived', color: tokens.colors.text.tertiary, bgcolor: tokens.colors.surface[2] };
    case 'draft':
    default:
      return { label: 'Draft', color: tokens.colors.status.warning, bgcolor: `${tokens.colors.status.warning}20` };
  }
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  description,
  image,
  status,
  visibility,
  updatedAt,
  members = [],
  isOwner = false,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action?: () => void) => {
    handleMenuClose();
    action?.();
  };

  const statusConfig = getStatusConfig(status);

  return (
    <Card
      sx={{
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: tokens.transitions.normal,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: tokens.shadows.lg,
          borderColor: tokens.colors.border.hover,
          '& .card-overlay': {
            opacity: 1,
          },
        },
      }}
      onClick={onClick}
    >
      {/* Project Image/Preview */}
      <Box sx={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        {image ? (
          <CardMedia
            component="img"
            height="160"
            image={image}
            alt={name}
            sx={{ objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: tokens.colors.surface[1],
              background: `linear-gradient(135deg, ${tokens.colors.surface[1]} 0%, ${tokens.colors.surface[2]} 100%)`,
            }}
          >
            <FolderIcon sx={{ fontSize: 48, color: tokens.colors.text.disabled }} />
          </Box>
        )}

        {/* Hover Overlay */}
        <Box
          className="card-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: tokens.transitions.fast,
          }}
        >
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
            Open Project
          </Typography>
        </Box>

        {/* Status Badge */}
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            height: 24,
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: statusConfig.color,
            bgcolor: statusConfig.bgcolor,
            backdropFilter: 'blur(8px)',
          }}
        />

        {/* Visibility Badge */}
        <Tooltip title={visibility === 'public' ? 'Public project' : 'Private project'}>
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {visibility === 'public' ? (
              <PublicIcon sx={{ fontSize: 14, color: tokens.colors.text.secondary }} />
            ) : (
              <LockIcon sx={{ fontSize: 14, color: tokens.colors.text.secondary }} />
            )}
          </Box>
        </Tooltip>
      </Box>

      <CardContent sx={{ p: 2 }}>
        {/* Title and Menu */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: tokens.colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              fontSize: '1rem',
            }}
          >
            {name}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{ ml: 1, mt: -0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Description */}
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: tokens.colors.text.tertiary,
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.5,
              minHeight: 42,
            }}
          >
            {description}
          </Typography>
        )}

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Members */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {members.length > 0 ? (
              <AvatarGroup
                max={3}
                sx={{
                  '& .MuiAvatar-root': {
                    width: 24,
                    height: 24,
                    fontSize: '0.625rem',
                    border: `2px solid ${tokens.colors.background.paper}`,
                  },
                }}
              >
                {members.map((member) => (
                  <Tooltip key={member.id} title={member.name}>
                    <Avatar
                      src={member.photoURL}
                      sx={{ bgcolor: member.color || tokens.colors.primary.main }}
                    >
                      {member.name?.[0]?.toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            ) : (
              <Typography variant="caption" sx={{ color: tokens.colors.text.disabled }}>
                No members
              </Typography>
            )}
          </Box>

          {/* Last Updated */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: tokens.colors.text.disabled }} />
            <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
              {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            bgcolor: tokens.colors.background.elevated,
            border: `1px solid ${tokens.colors.border.default}`,
            minWidth: 180,
          },
        }}
      >
        <MenuItem onClick={() => handleAction(onEdit)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onShare)}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDuplicate)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        {isOwner && (
          <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: tokens.colors.status.error }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: tokens.colors.status.error }} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default ProjectCard;
