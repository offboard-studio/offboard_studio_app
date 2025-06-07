/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from "@mui/material";
import { ChangeEvent, useState } from "react";
import Editor from "../../../core/editor";

import { ProjectInfo } from "../../../core/constants";

interface BoardSettingsProps {
    editor: Editor;
    onClose: () => void;
}

function BoardSettings({ editor, onClose }: BoardSettingsProps) {
    const [formData, setFormData] = useState({
        projectName: editor.getName(),
        description: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const [open, setOpen] = useState(true);

    // Name of package. Use empty string if not defined
    const [nameInput, setName] = useState(editor.projectInfoData.name || '');
    // Version of package. Use empty string if not defined
    const [versionInput, setVersion] = useState(editor.projectInfoData.version || '');
    // Description of package. Use empty string if not defined
    const [descriptionInput, setDescription] = useState(editor.projectInfoData.description || '');
    // Author of package. Use empty string if not defined
    const [authorInput, setAuthor] = useState(editor.projectInfoData.author || '');
    // Icon of package. Use empty string if not defined
    const [imageInput, setImage] = useState(editor.projectInfoData.image || '');

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        if (event.target?.result) {
            setImage(event.target?.result.toString());
        }
    };

    /**
     * Callback for file uploading.
     * It reads the file blob as data URI
     * @param event File input event
     */
    const onFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.length ? event.target.files[0] : null;

        if (file) {
            fileReader.readAsDataURL(file);
        }
    }

    /**
     * Callback for 'Ok' button of the dialog
     */
    const handleSubmit = () => {
        const projectinfo: ProjectInfo = {
            name: nameInput,
            version: versionInput,
            description: descriptionInput,
            author: authorInput,
            image: imageInput,
        };
        editor.editSaveInfoProject(projectinfo);
        setOpen(false);
        onClose();
    }


    function handleClose(): void {

        // console.log(editor.projectInfoData.version, "version");
        setOpen(false);
        onClose();

    }

    return (
        <Dialog
            open={open}
            fullWidth={true}
            maxWidth='md'
            onClose={handleClose}
            aria-labelledby="form-dialog-title">
            <DialogContent>
                <DialogContentText>
                    Name
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={nameInput}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                />
                <DialogContentText>
                    Version
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={versionInput}
                    onChange={(event) => setVersion(event.target.value)}
                    fullWidth
                />

                <DialogContentText>
                    Description
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={descriptionInput}
                    onChange={(event) => setDescription(event.target.value)}
                    fullWidth
                />

                <DialogContentText>
                    Author
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={authorInput}
                    onChange={(event) => setAuthor(event.target.value)}
                    fullWidth
                />
                <DialogContentText>
                    Image
                </DialogContentText>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Button
                            variant="outlined"
                            component="label"
                        >
                            Upload File Image
                            <input
                                type="file"
                                accept='.svg'
                                onChange={onFileUpload}
                                hidden
                            />
                        </Button>
                    </div>
                    {imageInput &&
                        <img src={imageInput} style={{ width: '80px', height: '80px' }} alt='block icon' />}
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSubmit} color="primary">
                    Save
                </Button>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default BoardSettings;