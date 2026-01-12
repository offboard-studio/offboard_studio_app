/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import './styles.scss';
import { Avatar, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@components/auth/AuthProvider';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { AccountCircle, SupervisedUserCircle } from '@mui/icons-material';

interface BoardUserButtonProps {
    onSettingsClick?: () => void;
}

const BoardUserButton: React.FC<BoardUserButtonProps> = ({ onSettingsClick }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, logout } = useAuth();
    const open = Boolean(anchorEl);
    const navigate = useNavigate();

    const isElectron = window.location.protocol === 'file:';

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleProfile = () => {
        navigate(isElectron ? '/#/user' : '/user');
        handleClose();
    };

    const handleLogout = async () => {
        await logout();
        navigate('/signin');
        handleClose();
    };

    return (
        <>
            <IconButton onClick={handleClick} color="inherit">
                {user?.photoURL ? (
                    <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
                ) : (
                    <AccountCircle sx={{ width: 32, height: 32 }} />
                )}
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                {user && (
                    <MenuItem disabled sx={{ opacity: 1 + "!important" }}>
                        <Typography variant="body2" color="textSecondary">{user.email}</Typography>
                    </MenuItem>
                )}
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={() => {
                    handleClose();
                    onSettingsClick?.();
                }}>Settings</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
        </>
    );
};

export default BoardUserButton;
