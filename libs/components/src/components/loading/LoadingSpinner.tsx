import React from 'react';
import { Box, Typography, CircularProgress, keyframes } from '@mui/material';
import { THEME_COLORS } from '../../core/constants';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const sizeMap = {
  small: 24,
  medium: 40,
  large: 60,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
}) => {
  const spinnerSize = sizeMap[size];

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 4,
      }}
    >
      <Box
        sx={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid ${THEME_COLORS.surface}`,
          borderTopColor: THEME_COLORS.primary,
          borderRadius: '50%',
          animation: `${spin} 1s linear infinite`,
        }}
      />
      {message && (
        <Typography
          variant="body2"
          sx={{
            color: THEME_COLORS.text.secondary,
            fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: THEME_COLORS.background,
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;
