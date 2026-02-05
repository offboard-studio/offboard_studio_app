import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';
import React, { useState } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { AiCodeBlockModelOptions } from '../blocks/basic/ai-code/code-model';


/**
 * 
 * @param {
 *          isOpen: True if modal needs to be opened.
 *          onResolve: Will be called to indicate success / completion.
 *          onReject: Will be called to indicate failure.
 *        }
 */
const AiCodeBlockDialog = ({ isOpen, onResolve, onReject, inputs, outputs, params, aiDescription }: InstanceProps<AiCodeBlockModelOptions> & Partial<AiCodeBlockModelOptions>) => {

    // Comma separated list of inputs for the Code block
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [inputPorts, setInputPorts] = useState((inputs || []).join(', ') || '');
    // Comma separated list of outputs for the Code block
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [outputPorts, setOutputPorts] = useState((outputs || []).join(', ') || '');
    // Comma separated list of parameters for the Code block
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [parameters, setParameters] = useState((params || []).join(', ') || '');
    const [error, setError] = useState('');

    const [aiDescriptionOut, setAiDescriptionOut] = useState(aiDescription || 'AI Description');

    /**
     * Callback for 'Ok' button of the dialog
     */
    const handleSubmit = () => {
        // If neither input or output field is filled, show an error message.
        if (aiDescription !== 'AI Description') {
            // Clear the previous error if any.
            setError('')
            // Split the inputs, outputs and parameters by comma 
            // const inputs = inputPorts.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // const outputs = outputPorts.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // const params = parameters.split(',').filter((port) => Boolean(port)).map((port) => port.trim());
            // Send data back indicating as success
            onResolve({ inputs: inputs, outputs: outputs, params: params, aiDescription: aiDescriptionOut });
        } else {
            setError('Code block needs a description');
        }
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
                    Enter Description for AI Code Block
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={aiDescriptionOut}
                    onChange={(event) => setAiDescriptionOut(event.target.value)}
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
                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Enter the input ports
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={inputPorts}
                    onChange={(event) => setInputPorts(event.target.value)}
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
                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Enter the output ports
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={outputPorts}
                    onChange={(event) => setOutputPorts(event.target.value)}
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

                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Enter the parameters
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={parameters}
                    onChange={(event) => setParameters(event.target.value)}
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
    )
}

const aiCreateCodeDialog = create(AiCodeBlockDialog);

export default aiCreateCodeDialog;