/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, TextField } from "@mui/material";
import { ChangeEvent, useState } from "react";
import Editor from "@components/core/editor";

import { ProjectInfo } from "@components/core/constants";

interface BoardSettingsProps {
    editor: Editor;
    onClose: () => void;
    projectId: string;
    currentProject?: any;
    onSave?: () => void;
}

function BoardSettings({ editor, onClose, projectId, currentProject, onSave }: BoardSettingsProps) {
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
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

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
    // Documentation fields
    const [documentationContent, setDocumentationContent] = useState(currentProject?.documentationContent || '');
    const [videoUrl, setVideoUrl] = useState(currentProject?.videoUrl || '');

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
    const handleSubmit = async () => {
        const projectinfo: ProjectInfo = {
            name: nameInput,
            version: versionInput,
            description: descriptionInput,
            author: authorInput,
            image: imageInput,
        };

        // Persist to Firebase
        setSaving(true);
        setError('');
        try {
            // Update editor first
            editor.editSaveInfoProject(projectinfo);

            // Import services
            const { firebaseProjectService } = await import('@components/infrastructure/firebase/firebase.project.service');
            const CollaborationManager = (await import('@components/core/collaboration')).default;

            // Update project settings in Firebase
            await firebaseProjectService.updateProject(projectId, {
                package: projectinfo,
                documentationContent,
                videoUrl,
            });

            // Sync the complete serialized project data through collaboration manager
            const collaborationManager = CollaborationManager.getInstance();
            collaborationManager.syncLocalToRemote();

            setOpen(false);
            onSave?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save project settings');
        } finally {
            setSaving(false);
        }
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
                    Version
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={versionInput}
                    onChange={(event) => setVersion(event.target.value)}
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
                    Description
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={descriptionInput}
                    onChange={(event) => setDescription(event.target.value)}
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
                    Author
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={authorInput}
                    onChange={(event) => setAuthor(event.target.value)}
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
                    Image
                </DialogContentText>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Button
                            variant="outlined"
                            component="label"
                            sx={{ color: '#BB86FC', borderColor: '#BB86FC' }}
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

                <DialogContentText sx={{ color: '#fff', mt: 3 }}>
                    Documentation (Markdown)
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={documentationContent}
                    onChange={(event) => setDocumentationContent(event.target.value)}
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="# Project Documentation\n\nAdd your markdown content here..."
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontFamily: 'monospace',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        }
                    }}
                />

                <DialogContentText sx={{ color: '#fff', mt: 2 }}>
                    Video URL (YouTube, Vimeo, etc.)
                </DialogContentText>
                <TextField
                    margin="dense"
                    type="text"
                    variant='outlined'
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    fullWidth
                    placeholder="https://www.youtube.com/watch?v=..."
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        }
                    }}
                />
                {error && (
                    <DialogContentText sx={{ color: '#f44336', mt: 2 }}>
                        {error}
                    </DialogContentText>
                )}

            </DialogContent>
            <DialogActions>
                <Button onClick={handleSubmit} disabled={saving} sx={{ color: '#BB86FC' }}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button onClick={handleClose} disabled={saving} sx={{ color: '#aaa' }}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog >
    );
}

export default BoardSettings;