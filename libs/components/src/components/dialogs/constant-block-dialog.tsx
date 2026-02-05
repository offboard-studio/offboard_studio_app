import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';
import Checkbox from '@mui/material/Checkbox/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel/FormControlLabel';
import React, { ChangeEvent, useState } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { ConstantBlockModelOptions } from '../blocks/basic/constant/constant-model';


/**
 * 
 * @param {
 *          isOpen: True if modal needs to be opened.
 *          onResolve: Will be called to indicate success / completion.
 *          onReject: Will be called to indicate failure.
 *        }
 */
const ConstantBlockDialog = ({ isOpen, onResolve, onReject, name: _name, local: _local }: InstanceProps<ConstantBlockModelOptions> & Partial<ConstantBlockModelOptions>) => {


  const [name, setName] = useState(_name || '');
  const [local, setLocal] = useState<boolean>(_local || true);

  const [errorMsg, setErrorMsg] = useState('');


  /**
   * Callback when constant input field changes.
   * @param event Constant input field change event
   */
  const handleInput = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // If there was error previously, clear the error message.
    if (errorMsg) {
      setErrorMsg('')
    }
    setName(event.target.value)
  }

  /**
   * Callback for 'Ok' button of the dialog
   */
  const handleSubmit = () => {
    // If name is defined, send the data back indicating success.
    if (name) {
      onResolve({ name: name, local: local })
    } else {
      // If name is not defined, show an error message.
      setErrorMsg('Block name is mandatory')
    }
  }

  return (
    <Dialog
      open={isOpen}
      aria-labelledby="form-dialog-title"
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
          Enter the name of constant block
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          type="text"
          variant='outlined'
          value={name}
          onChange={handleInput}
          error={Boolean(errorMsg)}
          helperText={errorMsg}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
              '&:hover fieldset': { borderColor: '#BB86FC' },
              '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
            },
            '& .MuiInputLabel-root': { color: '#aaa' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' },
            '& .MuiFormHelperText-root': { color: '#f44336' }
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              color='default'
              checked={local}
              onChange={(event) => setLocal(event.target.checked)}
              sx={{
                color: '#aaa',
                '&.Mui-checked': { color: '#BB86FC' }
              }}
            />
          }
          label={<span style={{ color: '#fff' }}>Local Parameter</span>}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onReject()} sx={{ color: '#aaa' }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} sx={{ color: '#BB86FC' }}>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const createConstantDialog = create(ConstantBlockDialog);

export default createConstantDialog;