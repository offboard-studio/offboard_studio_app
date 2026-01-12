/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { ChangeEvent, useState } from "react";
import Editor from "@components/core/editor";

import { ProjectInfo } from "@components/core/constants";
import { AiInterfaceOptionBlockDialog } from "@components/components/dialogs/ai-option-block-dialog";

interface AiOptionSettingsProps {
    editor: Editor;
    onClose: () => void;
    onResolve: (options: AiInterfaceOptionBlockDialog) => void;
    onReject: () => void;
    isOpen: boolean;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

function AiOptionSettings({ editor, onClose, apiKey, baseUrl, model, isOpen, onResolve, onReject }: AiOptionSettingsProps) {

    const [error, setError] = useState('');

    // Provider presets
    const providers = [
        { value: 'ollama', label: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', defaultModel: 'qwen2.5-coder' },
        { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: '', defaultModel: 'gpt-4' },
        { value: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', defaultModel: 'anthropic/claude-3.5-sonnet' },
        { value: 'custom', label: 'Custom', baseUrl: '', apiKey: '', defaultModel: '' },
    ];

    const [provider, setProvider] = useState('ollama');
    const [apiKeyOut, setApiKeyOut] = useState(editor.getApiKey() || 'ollama');
    const [baseUrlOut, setBaseUrlOut] = useState(editor.getBaseUrl() || 'http://localhost:11434/v1');
    const [modelOut, setModelOut] = useState(editor.getAiModel() || 'qwen2.5-coder');

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        const preset = providers.find(p => p.value === newProvider);
        if (preset && newProvider !== 'custom') {
            setBaseUrlOut(preset.baseUrl);
            setApiKeyOut(preset.apiKey);
            if (preset.defaultModel) {
                setModelOut(preset.defaultModel);
            }
        }
    };

    /**
     * Callback for 'Ok' button of the dialog
     */
    const handleSubmit = () => {
        setError('')
        editor.setApiKey(apiKeyOut);
        editor.setBaseUrl(baseUrlOut);
        editor.setAiModel(modelOut);
        onResolve({ apiKey: apiKeyOut, baseUrl: baseUrlOut, model: modelOut } as AiInterfaceOptionBlockDialog);
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
                <DialogContentText sx={{ color: '#fff', mb: 2 }}>
                    Select AI Provider
                </DialogContentText>
                <FormControl fullWidth margin="dense">
                    <Select
                        value={provider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        sx={{
                            color: '#fff',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#BB86FC' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#BB86FC' },
                            '& .MuiSvgIcon-root': { color: '#fff' },
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    bgcolor: '#1a1a1a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    '& .MuiMenuItem-root': {
                                        color: '#fff',
                                        '&:hover': { bgcolor: 'rgba(187, 134, 252, 0.1)' },
                                        '&.Mui-selected': { bgcolor: 'rgba(187, 134, 252, 0.2)' },
                                    }
                                }
                            }
                        }}
                    >
                        {providers.map((p) => (
                            <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <DialogContentText sx={{ color: '#fff', mt: 3 }}>
                    Base URL
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={baseUrlOut}
                    onChange={(event) => setBaseUrlOut(event.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    disabled={provider !== 'custom'}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        }
                    }}
                />
                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Set API Key generally used for AI Code Blocks.
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={apiKeyOut}
                    onChange={(event) => setApiKeyOut(event.target.value)}
                    error={Boolean(error)}
                    helperText={provider === 'ollama' ? 'No API key needed for local Ollama' : error}
                    disabled={provider === 'ollama'}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        }
                    }}
                />

                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Set Model
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={modelOut}
                    onChange={(event) => setModelOut(event.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        }
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
    );
}

export default AiOptionSettings;