/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from "@mui/material";
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

    const [apiKeyOut, setApiKeyOut] = useState(editor.getApiKey() || 'ollama');
    const [baseUrlOut, setBaseUrlOut] = useState(editor.getBaseUrl() || 'http://localhost:11434/api/v1');
    const [modelOut, setModelOut] = useState(editor.getAiModel() || 'qwen2.5-coder');

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
        <Dialog open={isOpen} aria-labelledby="form-dialog-title" fullWidth>

            <DialogContent>
                <DialogContentText>
                    Enter Base URL for AI Code Block
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
                />
                <DialogContentText>
                    Set API Key generally used for AI Code Blocks.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={apiKeyOut}
                    onChange={(event) => setApiKeyOut(event.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                />

                <DialogContentText>
                    Set Model
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={modelOut}
                    onChange={(event) => setModelOut(event.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                />

            </DialogContent>
            <DialogActions>
                <Button onClick={() => onReject()}>
                    Cancel
                </Button>
                <Button onClick={() => handleSubmit()}>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AiOptionSettings;