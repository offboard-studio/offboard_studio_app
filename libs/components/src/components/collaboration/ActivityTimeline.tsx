import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { tokens } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

export type ActivityType =
  | 'node_added'
  | 'node_edited'
  | 'node_deleted'
  | 'link_added'
  | 'link_deleted'
  | 'member_joined'
  | 'member_left'
  | 'settings_changed'
  | 'deployment_started'
  | 'deployment_completed';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userColor: string;
  userPhotoURL?: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const getActivityIcon = (type: ActivityType) => {
  const iconStyle = { fontSize: 14 };
  switch (type) {
    case 'node_added':
      return <AddIcon sx={iconStyle} />;
    case 'node_edited':
      return <EditIcon sx={iconStyle} />;
    case 'node_deleted':
      return <DeleteIcon sx={iconStyle} />;
    case 'link_added':
    case 'link_deleted':
      return <LinkIcon sx={iconStyle} />;
    case 'member_joined':
    case 'member_left':
      return <PersonAddIcon sx={iconStyle} />;
    case 'settings_changed':
      return <SettingsIcon sx={iconStyle} />;
    case 'deployment_started':
    case 'deployment_completed':
      return <PlayArrowIcon sx={iconStyle} />;
    default:
      return <EditIcon sx={iconStyle} />;
  }
};

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'node_added':
    case 'link_added':
    case 'member_joined':
      return tokens.colors.status.success;
    case 'node_deleted':
    case 'link_deleted':
    case 'member_left':
      return tokens.colors.status.error;
    case 'node_edited':
    case 'settings_changed':
      return tokens.colors.status.info;
    case 'deployment_started':
      return tokens.colors.status.warning;
    case 'deployment_completed':
      return tokens.colors.status.success;
    default:
      return tokens.colors.text.tertiary;
  }
};

interface ActivityItemProps {
  activity: Activity;
  isLast: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isLast }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      {/* Timeline line and dot */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: `${getActivityColor(activity.type)}20`,
            color: getActivityColor(activity.type),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getActivityIcon(activity.type)}
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              minHeight: 20,
              bgcolor: tokens.colors.border.default,
              my: 0.5,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: isLast ? 0 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Avatar
            src={activity.userPhotoURL}
            sx={{
              width: 20,
              height: 20,
              fontSize: '0.625rem',
              bgcolor: activity.userColor,
            }}
          >
            {activity.userName?.[0]?.toUpperCase()}
          </Avatar>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: tokens.colors.text.primary }}
          >
            {activity.userName}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
          {activity.description}
        </Typography>
      </Box>
    </Box>
  );
};

interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
  title?: string;
  collapsible?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  maxItems = 10,
  title = 'Recent Activity',
  collapsible = true,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const displayedActivities = showAll ? activities : activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  if (activities.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          sx={{ color: tokens.colors.text.tertiary, textAlign: 'center' }}
        >
          No recent activity
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: expanded ? `1px solid ${tokens.colors.border.default}` : 'none',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>
          {title}
        </Typography>
        {collapsible && (
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {displayedActivities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isLast={index === displayedActivities.length - 1 && !hasMore}
            />
          ))}

          {hasMore && !showAll && (
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Chip
                label={`Show ${activities.length - maxItems} more`}
                onClick={() => setShowAll(true)}
                size="small"
                sx={{
                  cursor: 'pointer',
                  bgcolor: tokens.colors.surface[2],
                  '&:hover': { bgcolor: tokens.colors.surface[3] },
                }}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ActivityTimeline;
