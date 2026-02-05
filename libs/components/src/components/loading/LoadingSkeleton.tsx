import React from 'react';
import { Box, Skeleton, keyframes } from '@mui/material';
import { THEME_COLORS } from '../../core/constants';

const pulse = keyframes`
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 0.4;
  }
`;

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'dashboard' | 'board' | 'profile';
  count?: number;
}

export const CardSkeleton: React.FC = () => (
  <Box
    sx={{
      backgroundColor: THEME_COLORS.surface,
      borderRadius: 2,
      padding: 2,
      border: `1px solid ${THEME_COLORS.border}`,
    }}
  >
    <Skeleton
      variant="rectangular"
      height={140}
      sx={{
        backgroundColor: '#1a1a1a',
        borderRadius: 1,
        mb: 2,
      }}
    />
    <Skeleton
      variant="text"
      width="70%"
      height={24}
      sx={{ backgroundColor: '#1a1a1a', mb: 1 }}
    />
    <Skeleton
      variant="text"
      width="50%"
      height={16}
      sx={{ backgroundColor: '#1a1a1a' }}
    />
  </Box>
);

export const ListItemSkeleton: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: 2,
      borderBottom: `1px solid ${THEME_COLORS.border}`,
    }}
  >
    <Skeleton
      variant="circular"
      width={40}
      height={40}
      sx={{ backgroundColor: '#1a1a1a' }}
    />
    <Box sx={{ flex: 1 }}>
      <Skeleton
        variant="text"
        width="60%"
        height={20}
        sx={{ backgroundColor: '#1a1a1a', mb: 0.5 }}
      />
      <Skeleton
        variant="text"
        width="40%"
        height={16}
        sx={{ backgroundColor: '#1a1a1a' }}
      />
    </Box>
  </Box>
);

export const DashboardSkeleton: React.FC = () => (
  <Box sx={{ padding: 3 }}>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
      <Skeleton
        variant="text"
        width={200}
        height={40}
        sx={{ backgroundColor: '#1a1a1a' }}
      />
      <Skeleton
        variant="rectangular"
        width={120}
        height={40}
        sx={{ backgroundColor: '#1a1a1a', borderRadius: 1 }}
      />
    </Box>

    {/* Project Grid */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 3,
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </Box>
  </Box>
);

export const BoardSkeleton: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      height: 'calc(100vh - 48px)',
      backgroundColor: THEME_COLORS.background,
    }}
  >
    {/* Sidebar */}
    <Box
      sx={{
        width: 280,
        borderRight: `1px solid ${THEME_COLORS.border}`,
        padding: 2,
      }}
    >
      <Skeleton
        variant="text"
        width="80%"
        height={32}
        sx={{ backgroundColor: '#1a1a1a', mb: 2 }}
      />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={40}
          sx={{ backgroundColor: '#1a1a1a', mb: 1, borderRadius: 1 }}
        />
      ))}
    </Box>

    {/* Canvas Area */}
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          border: `3px solid ${THEME_COLORS.surface}`,
          borderTopColor: THEME_COLORS.primary,
          borderRadius: '50%',
          animation: `${pulse} 1.5s ease-in-out infinite`,
        }}
      />
      <Skeleton
        variant="text"
        width={150}
        height={20}
        sx={{ backgroundColor: '#1a1a1a' }}
      />
    </Box>
  </Box>
);

export const ProfileSkeleton: React.FC = () => (
  <Box sx={{ padding: 3, maxWidth: 600, margin: '0 auto' }}>
    {/* Avatar */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
      <Skeleton
        variant="circular"
        width={80}
        height={80}
        sx={{ backgroundColor: '#1a1a1a' }}
      />
      <Box sx={{ flex: 1 }}>
        <Skeleton
          variant="text"
          width="50%"
          height={32}
          sx={{ backgroundColor: '#1a1a1a', mb: 1 }}
        />
        <Skeleton
          variant="text"
          width="70%"
          height={20}
          sx={{ backgroundColor: '#1a1a1a' }}
        />
      </Box>
    </Box>

    {/* Form Fields */}
    {[1, 2, 3].map((i) => (
      <Box key={i} sx={{ mb: 3 }}>
        <Skeleton
          variant="text"
          width={100}
          height={20}
          sx={{ backgroundColor: '#1a1a1a', mb: 1 }}
        />
        <Skeleton
          variant="rectangular"
          height={56}
          sx={{ backgroundColor: '#1a1a1a', borderRadius: 1 }}
        />
      </Box>
    ))}
  </Box>
);

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
}) => {
  switch (variant) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'board':
      return <BoardSkeleton />;
    case 'profile':
      return <ProfileSkeleton />;
    case 'list':
      return (
        <>
          {Array.from({ length: count }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </>
      );
    case 'card':
    default:
      return (
        <>
          {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </>
      );
  }
};

export default LoadingSkeleton;
