/* eslint-disable react/jsx-no-useless-fragment */
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import { Link } from 'react-router-dom';
import React from 'react';

interface SidebarItemProps {
  item?: {
    path: string;
    label: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
  label?: string;
  path?: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  depth?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  icon,
  label,
  path = '',
  isActive = false,
  onClick,
  disabled = false,
  depth = 0,
}) => {
  // Use props from item object if provided, otherwise use individual props
  const itemProps = item || {
    path,
    label: label || '',
    icon,
    isActive,
    onClick,
  };

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (itemProps.onClick) {
      event.preventDefault();
      itemProps.onClick();
    }
  };

  const getIndentLevel = (currentDepth: number) => {
    return currentDepth * 16;
  };

  const buttonContent = (
    <ListItemButton
      onClick={handleClick}
      disabled={disabled}
      sx={{
        pl: `${16 + getIndentLevel(depth)}px`,
        py: 1.5,
        mx: 1,
        mb: 0.5,
        borderRadius: '8px',
        minHeight: '48px',
        transition: 'all 0.3s ease',
        backgroundColor: isActive ? 'rgba(52, 152, 219, 0.2)' : 'transparent',
        borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
        '&:hover': {
          backgroundColor: disabled
            ? 'transparent'
            : isActive
            ? 'rgba(52, 152, 219, 0.3)'
            : 'rgba(255, 255, 255, 0.1)',
          transform: disabled ? 'none' : 'translateX(4px)',
          boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
        },
        '&:active': {
          transform: disabled ? 'none' : 'translateX(2px)',
        },
        '&.Mui-disabled': {
          opacity: 0.5,
          color: '#666',
        },
      }}
    >
      {itemProps.icon && (
        <ListItemIcon
          sx={{
            color: isActive ? '#3498db' : '#bbb',
            minWidth: '40px',
            transition: 'color 0.2s ease',
          }}
        >
          {itemProps.icon}
        </ListItemIcon>
      )}

      <ListItemText
        primary={
          <Typography
            variant="body2"
            sx={{
              color: isActive ? '#3498db' : 'white',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'color 0.2s ease',
            }}
          >
            {itemProps.label}
          </Typography>
        }
      />

      {/* Optional indicator for active state */}
      {isActive && (
        <Box
          sx={{
            width: '4px',
            height: '20px',
            backgroundColor: '#3498db',
            borderRadius: '2px',
            ml: 1,
          }}
        />
      )}
    </ListItemButton>
  );

  // If no path or onClick, render button without Link wrapper
  if (!itemProps.path || itemProps.onClick) {
    return buttonContent;
  }

  // Render with Link wrapper for navigation
  return (
    <Box component={Link} to={itemProps.path} sx={{ textDecoration: 'none' }}>
      {buttonContent}
    </Box>
  );
};

export default SidebarItem;
