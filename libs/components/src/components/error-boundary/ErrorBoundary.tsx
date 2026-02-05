import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: 4,
            backgroundColor: '#0a0a0a',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 64,
              color: '#f44336',
              mb: 2,
            }}
          />
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 700,
              mb: 1,
            }}
          >
            Something went wrong
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#666',
              mb: 3,
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. Please try again or reload the page.
          </Typography>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                backgroundColor: '#1a1a1a',
                borderRadius: 1,
                padding: 2,
                mb: 3,
                maxWidth: 500,
                overflow: 'auto',
                textAlign: 'left',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#f44336',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              sx={{
                color: '#BB86FC',
                borderColor: '#BB86FC',
                '&:hover': {
                  borderColor: '#BB86FC',
                  backgroundColor: 'rgba(187, 134, 252, 0.1)',
                },
              }}
            >
              Try Again
            </Button>
            <Button
              variant="contained"
              onClick={this.handleReload}
              sx={{
                backgroundColor: '#BB86FC',
                '&:hover': {
                  backgroundColor: '#9a67ea',
                },
              }}
            >
              Reload Page
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
