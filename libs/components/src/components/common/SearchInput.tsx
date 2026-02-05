import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Fade,
  ClickAwayListener,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { tokens } from '../../theme';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'suggestion' | 'trending';
  metadata?: Record<string, unknown>;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  autoFocus?: boolean;
  fullWidth?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  suggestions = [],
  showSuggestions = true,
  autoFocus = false,
  fullWidth = false,
}) => {
  const [focused, setFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleFocus = () => {
    setFocused(true);
    if (showSuggestions && suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (showSuggestions && newValue.length > 0) {
      setShowDropdown(true);
    } else if (newValue.length === 0) {
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
      setShowDropdown(false);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSearch?.(suggestion.text);
    setShowDropdown(false);
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <HistoryIcon sx={{ fontSize: 18, color: tokens.colors.text.tertiary }} />;
      case 'trending':
        return <TrendingUpIcon sx={{ fontSize: 18, color: tokens.colors.accent.orange }} />;
      default:
        return <SearchIcon sx={{ fontSize: 18, color: tokens.colors.text.tertiary }} />;
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setShowDropdown(false)}>
      <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 320 }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.75,
            bgcolor: tokens.colors.surface[1],
            border: `1px solid ${focused ? tokens.colors.border.active : tokens.colors.border.default}`,
            borderRadius: tokens.borderRadius.lg,
            transition: tokens.transitions.fast,
            '&:hover': {
              borderColor: tokens.colors.border.hover,
            },
          }}
        >
          <SearchIcon
            sx={{
              color: focused ? tokens.colors.primary.main : tokens.colors.text.tertiary,
              mr: 1,
              fontSize: 20,
              transition: tokens.transitions.fast,
            }}
          />
          <InputBase
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            sx={{
              flex: 1,
              fontSize: '0.9375rem',
              '& input': {
                p: 0,
                color: tokens.colors.text.primary,
                '&::placeholder': {
                  color: tokens.colors.text.tertiary,
                  opacity: 1,
                },
              },
            }}
          />
          {value && (
            <IconButton size="small" onClick={handleClear} sx={{ ml: 0.5 }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Paper>

        {/* Suggestions Dropdown */}
        <Fade in={showDropdown && suggestions.length > 0}>
          <Paper
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              bgcolor: tokens.colors.background.elevated,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.borderRadius.lg,
              maxHeight: 320,
              overflow: 'auto',
              zIndex: 1300,
              boxShadow: tokens.shadows.lg,
            }}
          >
            <List sx={{ py: 0.5 }}>
              {suggestions.map((suggestion) => (
                <ListItem
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: tokens.colors.background.hover,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getSuggestionIcon(suggestion.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ color: tokens.colors.text.primary }}>
                        {suggestion.text}
                      </Typography>
                    }
                  />
                  {suggestion.type === 'trending' && (
                    <Chip
                      label="Trending"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.625rem',
                        bgcolor: `${tokens.colors.accent.orange}20`,
                        color: tokens.colors.accent.orange,
                      }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Fade>
      </Box>
    </ClickAwayListener>
  );
};

export default SearchInput;
