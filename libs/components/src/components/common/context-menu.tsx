import React from 'react';
import { Typography, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onClose }) => {
  return (
    <>
      {/* Backdrop to close menu on click outside */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* Menu */}
      <Box
        sx={{
          position: 'fixed',
          top: y,
          left: x,
          bgcolor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          padding: 1,
          zIndex: 10000, // Higher than everything
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: 140,
        }}
      >
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          sx={{
            padding: '10px 16px',
            cursor: 'pointer',
            color: '#ff5252',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: '0.2s',
            '&:hover': {
              bgcolor: 'rgba(255, 82, 82, 0.1)',
            }
          }}
        >
          <DeleteIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Delete</Typography>
        </Box>
      </Box>
    </>
  );
};

export default ContextMenu;
