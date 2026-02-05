
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TerminalIcon from '@mui/icons-material/Terminal';

interface DeploymentDialogProps {
  open: boolean;
  onClose: () => void;
}

export const DeploymentDialog: React.FC<DeploymentDialogProps> = ({ open, onClose }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<'config' | 'deploying' | 'result'>('config');

  const handleDeploy = async () => {
    setLoading(true);
    setActiveStep('deploying');
    setLogs(['Initiating deployment...', `Connecting to ${host}:${port}...`]);

    try {
      // TODO: Replace with actual API call to backend
      const response = await fetch('http://localhost:3333/api/deployment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssh: {
            host,
            port: parseInt(port),
            username,
            password
          },
          commands: [
            'echo "Connected successfully!"',
            'mkdir -p remote_deploy',
            'cd remote_deploy',
            'touch deployed_at.txt',
            'ls -la'
          ]
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setLogs(prev => [...prev, ...result.logs, 'Deployment Successful!']);
        setActiveStep('result');
      } else {
         setLogs(prev => [...prev, `Error: ${result.error}`, 'Deployment Failed.']);
         setActiveStep('result');
      }

    } catch (error: any) {
      setLogs(prev => [...prev, `Network Error: ${error.message}`, 'Deployment Failed.']);
      setActiveStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
      if (loading) return;
      onClose();
      // Reset state on close if needed, or keep for persistence
      if (activeStep === 'result') {
          setActiveStep('config');
          setLogs([]);
      }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
             <TerminalIcon />
             Deploy to Device (SSH)
          </Box>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {activeStep === 'config' && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="gray">
                Enter the SSH credentials of the target device (e.g., Raspberry Pi, Server).
            </Typography>
            <TextField
                label="Host / IP Address"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                fullWidth
                required
            />
            <TextField
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                fullWidth
                type="number"
            />
            <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                required
            />
            <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                helperText="Password based authentication"
            />
            </Box>
        )}

        {(activeStep === 'deploying' || activeStep === 'result') && (
            <Box 
              bgcolor="#1e1e1e" 
              color="#0f0" 
              p={2} 
              borderRadius={1} 
              height="300px" 
              overflow="auto"
              fontFamily="monospace"
              fontSize="0.9rem"
            >
                {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                ))}
                {loading && <div>_</div>}
            </Box>
        )}

      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          {activeStep === 'result' ? 'Close' : 'Cancel'}
        </Button>
        {activeStep === 'config' && (
            <Button 
                onClick={handleDeploy} 
                variant="contained" 
                color="primary"
                disabled={!host || !username || !password || loading}
            >
            {loading ? <CircularProgress size={24} /> : 'Connect & Deploy'}
            </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
