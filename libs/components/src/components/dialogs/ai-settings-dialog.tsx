import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { create, InstanceProps } from 'react-modal-promise';

export interface AiSettings {
    apiKey: string;
    baseUrl: string;
    model: string;
}

/**
 * 
 * @param {
 *          isOpen: True if modal needs to be opened.
 *          onResolve: Will be called to indicate success / completion.
 *          onReject: Will be called to indicate failure.
 *        }
 */
const AiSettingsDialog = ({ isOpen, onResolve, onReject, apiKey, baseUrl, model }: InstanceProps<AiSettings> & Partial<AiSettings>) => {

    // Use props if provided (including empty strings), otherwise fallback to defaults
    const [apiKeyVal, setApiKeyVal] = useState(apiKey ?? '');
    const [baseUrlVal, setBaseUrlVal] = useState(baseUrl ?? 'https://openrouter.ai/api/v1');
    const [modelVal, setModelVal] = useState(model ?? 'google/gemini-2.0-flash-exp:free');
    
    // Sync state with props when they change (critical for component reuse)
    useEffect(() => {
        setApiKeyVal(apiKey ?? '');
        setBaseUrlVal(baseUrl ?? 'https://openrouter.ai/api/v1');
        setModelVal(model ?? 'google/gemini-2.0-flash-exp:free');
    }, [apiKey, baseUrl, model, isOpen]); // Sync when opened or props change
    
    /**
     * Callback for 'Ok' button of the dialog
     */
    const handleSubmit = () => {
        onResolve({ apiKey: apiKeyVal, baseUrl: baseUrlVal, model: modelVal });
    }

    return (
        <Dialog
            open={isOpen}
            aria-labelledby="form-dialog-title"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#111',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.05)'
                }
            }}
        >

            <DialogContent>
                <DialogContentText sx={{ color: '#fff' }}>
                    OpenRouter API Settings
                </DialogContentText>
                
                <TextField
                    autoFocus
                    margin="dense"
                    label="API Key"
                    type="password"
                    variant='outlined'
                    value={apiKeyVal}
                    onChange={(event) => setApiKeyVal(event.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' }
                    }}
                />

                <TextField
                    margin="dense"
                    label="Base URL"
                    type="text"
                    variant='outlined'
                    value={baseUrlVal}
                    onChange={(event) => setBaseUrlVal(event.target.value)}
                    fullWidth
                    sx={{
                        mt: 2,
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                         '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' }
                    }}
                />
                 <TextField
                    margin="dense"
                    label="Model"
                    type="text"
                    variant='outlined'
                    value={modelVal}
                    onChange={(event) => setModelVal(event.target.value)}
                    fullWidth
                    sx={{
                        mt: 2,
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        },
                         '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                         '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' }
                    }}
                />

            </DialogContent>
            <DialogActions>
                <Button onClick={() => onReject()} sx={{ color: '#aaa' }}>
                    Cancel
                </Button>
                <Button onClick={() => handleSubmit()} sx={{ color: '#BB86FC' }}>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    )
}

const createAiSettingsDialog = create(AiSettingsDialog);

export default createAiSettingsDialog;
