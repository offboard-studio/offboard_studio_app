/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import { useState } from 'react';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import { CollectionBlockType } from '../blocks/collection/collection-factory';

interface SidebarItemCollapseProps {
  blocks: CollectionBlockType;
  keyPrefix?: string;
  blocks_label?: string;
  setBlock: (type: string) => void;
  depth?: number;
}

const SidebarItemCollapse: React.FC<SidebarItemCollapseProps> = ({
  blocks_label,
  blocks,
  keyPrefix = '',
  setBlock,
  depth = 0,
}) => {
  const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({});
  const [isRendered, setIsRendered] = useState(false);

  const handleToggle = (key: string, forceClose = false) => {
    setIsRendered(true);
    setOpenStates((prev) => ({
      ...prev,
      [key]: forceClose ? false : !prev[key],
    }));
  };

  const getIndentLevel = (currentDepth: number) => {
    return Math.min(currentDepth * 16, 48); // Max indent of 48px
  };

  const getBackgroundOpacity = (currentDepth: number) => {
    return Math.max(0.05, 0.1 - currentDepth * 0.02);
  };

  const renderBlocks = (
    blocks: CollectionBlockType,
    parentKey: string = '',
    currentDepth: number = 0
  ) => {
    return Object.entries(blocks).map(([name, block]) => {
      const newKey = parentKey ? `${parentKey}.${name}` : name;
      const isOpen = openStates[newKey] || false;
      const indentLevel = getIndentLevel(currentDepth);
      const bgOpacity = getBackgroundOpacity(currentDepth);

      return (
        <Box key={newKey}>
          <ListItemButton
            onClick={() =>
              block.children ? handleToggle(newKey) : setBlock(newKey)
            }
            sx={{
              pl: `${16 + indentLevel}px`,
              py: 1,
              minHeight: '44px',
              backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
              borderLeft: currentDepth > 0 ? '2px solid #4a5568' : 'none',
              borderRadius: currentDepth > 0 ? '0 8px 8px 0' : '8px',
              margin: '2px 4px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: `rgba(52, 152, 219, 0.2)`,
                transform: 'translateX(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              },
              '&:active': {
                transform: 'translateX(2px)',
              },
            }}
          >
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{
                    color: 'white',
                    fontSize: Math.max(0.8, 1 - currentDepth * 0.1) + 'rem',
                    fontWeight: block.children ? 600 : 400,
                    opacity: Math.max(0.7, 1 - currentDepth * 0.1),
                  }}
                >
                  {block.label}
                </Typography>
              }
            />
            {block.children && (
              <Box
                sx={{
                  color: '#bbb',
                  transition: 'transform 0.2s ease',
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              >
                <ExpandLessOutlinedIcon fontSize="small" />
              </Box>
            )}
          </ListItemButton>

          {block.children && isRendered && (
            <Collapse
              in={isOpen}
              timeout={300}
              unmountOnExit
              sx={{
                '& .MuiCollapse-wrapper': {
                  borderLeft: currentDepth === 0 ? '1px solid #4a5568' : 'none',
                  marginLeft: currentDepth === 0 ? '8px' : '0px',
                },
              }}
            >
              <List component="div" disablePadding>
                {renderBlocks(block.children, newKey, currentDepth + 1)}
              </List>
            </Collapse>
          )}
        </Box>
      );
    });
  };

  return (
    <Box
      sx={{
        maxHeight: '100%',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(255,255,255,0.3)',
        },
      }}
    >
      {blocks_label && (
        <Box sx={{ p: 2, borderBottom: '1px solid #4a5568' }}>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#3498db',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {blocks_label}
          </Typography>
        </Box>
      )}

      <Collapse in={true} timeout="auto">
        <List component="div" disablePadding sx={{ pt: 1 }}>
          {renderBlocks(blocks, keyPrefix, depth)}
        </List>
      </Collapse>
    </Box>
  );
};

export default SidebarItemCollapse;
