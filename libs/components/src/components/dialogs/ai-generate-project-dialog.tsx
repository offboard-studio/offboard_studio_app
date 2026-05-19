import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import axios from 'axios';
import React, { useState } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { AppError, ErrorCode } from '../../core/errors/AppError';
import { reportError } from '../../core/errors/errorReporter';

export interface GeneratedArchitecture {
    architecture: {
        version: string;
        editor: unknown;
        design: unknown;
        dependencies: Record<string, unknown>;
    };
    component_count: number;
    wire_count: number;
    explanation: string;
    provider: string;
    model: string;
    generation_time: number;
}

const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    'https://offboard-studio-backend.vercel.app';

const AiGenerateProjectDialog = ({
    isOpen,
    onResolve,
    onReject,
}: InstanceProps<GeneratedArchitecture>) => {
    const [prompt, setPrompt] = useState('');
    const [includeCatalog, setIncludeCatalog] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!prompt.trim()) {
            setErrorMessage('Lütfen bir açıklama girin.');
            return;
        }
        setErrorMessage(null);
        setLoading(true);
        try {
            const response = await axios.post<GeneratedArchitecture>(
                `${BACKEND_URL.replace(/\/$/, '')}/api/v1/ai/generate-architecture`,
                { prompt: prompt.trim(), include_catalog: includeCatalog },
                {
                    withCredentials: true,
                    timeout: 120_000,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
            onResolve(response.data);
        } catch (err) {
            const friendly =
                axios.isAxiosError(err) && err.response?.data?.detail
                    ? String(err.response.data.detail)
                    : 'AI proje oluşturulamadı. Backend erişilebilir mi?';
            setErrorMessage(friendly);
            reportError(
                new AppError({
                    code: ErrorCode.NETWORK_ERROR,
                    message: friendly,
                    originalError: err,
                }),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    bgcolor: '#111',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.05)',
                },
            }}
        >
            <DialogTitle sx={{ color: '#fff' }}>AI ile Proje Oluştur</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ color: '#bbb', mb: 2 }}>
                    Ne tür bir proje istediğinizi tarif edin. AI bileşenleri
                    üretip otomatik bağlayacak ve editöre yükleyecek.
                </DialogContentText>
                <TextField
                    autoFocus
                    fullWidth
                    multiline
                    minRows={4}
                    label="Proje açıklaması"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Örn: RRR tipi robot kol için ROS2 tabanlı bir kontrol mimarisi"
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.23)' },
                            '&:hover fieldset': { borderColor: '#BB86FC' },
                            '&.Mui-focused fieldset': { borderColor: '#BB86FC' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#BB86FC' },
                    }}
                />
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input
                        type="checkbox"
                        id="include-catalog"
                        checked={includeCatalog}
                        onChange={(e) => setIncludeCatalog(e.target.checked)}
                        disabled={loading}
                    />
                    <Typography
                        component="label"
                        htmlFor="include-catalog"
                        sx={{ color: '#bbb' }}
                    >
                        Mevcut blok kataloğunu prompt'a ekle
                    </Typography>
                </Box>
                {errorMessage && (
                    <Typography sx={{ color: '#ff6b6b', mt: 2 }}>
                        {errorMessage}
                    </Typography>
                )}
                {loading && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={18} sx={{ color: '#BB86FC' }} />
                        <Typography sx={{ color: '#bbb' }}>
                            AI projeniz oluşturuluyor… (10–60 sn sürebilir)
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onReject()} sx={{ color: '#aaa' }} disabled={loading}>
                    İptal
                </Button>
                <Button
                    onClick={handleSubmit}
                    sx={{ color: '#BB86FC' }}
                    disabled={loading || !prompt.trim()}
                >
                    Oluştur
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const createAiGenerateProjectDialog = create(AiGenerateProjectDialog);

export default createAiGenerateProjectDialog;
