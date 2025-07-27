import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';
import React, { useState } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { AiCodeBlockModelOptions } from '../blocks/basic/ai-code/code-model';
import { BaseModelOptions } from '@projectstorm/react-canvas-core';


export interface AiInterfaceOptionBlockDialog extends BaseModelOptions {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

/**
 * 
 * @param {
 *          isOpen: True if modal needs to be opened.
 *          onResolve: Will be called to indicate success / completion.
 *          onReject: Will be called to indicate failure.
 *        }
 */
const AiOptionBlockDialog = ({ isOpen, onResolve, onReject, apiKey, baseUrl }: InstanceProps<AiInterfaceOptionBlockDialog> & Partial<AiInterfaceOptionBlockDialog>) => {

    const [error, setError] = useState('');

    const [apiKeyOut, setApiKeyOut] = useState(apiKey || 'AI Description');
    const [baseUrlOut, setBaseUrlOut] = useState(baseUrl || 'AI Description');

    /**
     * Callback for 'Ok' button of the dialog
     */
    const handleSubmit = () => {
        // If neither input or output field is filled, show an error message.
        if (apiKeyOut !== 'AI Description') {
            // Clear the previous error if any.
            setError('')
            // Split the inputs, outputs and parameters by comma 
            // const inputs = inputPorts.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // const outputs = outputPorts.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // const params = parameters.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // Send data back indicating as success
            onResolve({ apiKey: apiKeyOut, baseUrl: baseUrlOut } as AiInterfaceOptionBlockDialog);
        } else {
            setError('Code block needs a description');
        }
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
    )
}

const aiCreateOptionDialog = create(AiOptionBlockDialog);

export { aiCreateOptionDialog, AiOptionBlockDialog };
