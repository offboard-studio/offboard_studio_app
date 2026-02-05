import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import PresenceManager, { UserPresence, PresenceState } from '../../core/presence/PresenceManager';
import { tokens } from '../../theme';

const cursorFadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

interface CursorProps {
  user: UserPresence;
  containerRef: React.RefObject<HTMLElement>;
}

const Cursor: React.FC<CursorProps> = ({ user, containerRef }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (user.cursor && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: user.cursor.x,
        y: user.cursor.y,
      });
    }
  }, [user.cursor, containerRef]);

  if (!user.cursor) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 9999,
        animation: `${cursorFadeIn} 0.2s ease-out`,
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.65376 12.4563L5.65376 4.01562L12.0958 10.4576L8.67666 10.4576L8.46154 10.5428L5.65376 12.4563Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: 16,
          backgroundColor: user.color,
          color: '#fff',
          padding: '2px 8px',
          borderRadius: tokens.borderRadius.sm,
          fontSize: '0.6875rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: tokens.shadows.md,
        }}
      >
        {user.displayName}
      </Box>
    </Box>
  );
};

interface LiveCursorsProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ containerRef, enabled = true }) => {
  const [presenceState, setPresenceState] = useState<PresenceState>({
    users: new Map(),
    currentUser: null,
  });

  useEffect(() => {
    if (!enabled) return;

    const presenceManager = PresenceManager.getInstance();
    const unsubscribe = presenceManager.subscribe(setPresenceState);
    return () => unsubscribe();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const presenceManager = PresenceManager.getInstance();
    const container = containerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      presenceManager.updateCursor(x, y);
    };

    const handleMouseLeave = () => {
      presenceManager.updateCursor(-1, -1);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, enabled]);

  if (!enabled) return null;

  const otherUsers = Array.from(presenceState.users.values()).filter(
    (user) =>
      user.odcId !== presenceState.currentUser?.odcId &&
      user.cursor &&
      user.cursor.x >= 0 &&
      user.cursor.y >= 0
  );

  return (
    <>
      {otherUsers.map((user) => (
        <Cursor key={user.odcId} user={user} containerRef={containerRef} />
      ))}
    </>
  );
};

export default LiveCursors;
