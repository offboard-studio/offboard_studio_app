/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import './styles.scss';
import { Avatar, IconButton, Menu, MenuItem } from '@mui/material';
// import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { AccountCircle, SupervisedUserCircle } from '@mui/icons-material';

const BoardUserButton: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    // const navigate = useNavigate(); // useNavigate hook'unu kullan

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    // const handleProfile = () => {
    //     navigate('/user'); // Profile sayfasına yönlendirme
    //     handleClose();
    // };

    const handleLogout = () => {
    };

    return (
        <>
            <IconButton onClick={handleClick}>
                <AccountCircle style={{ scale: 1.5 }} />

                <div style={{ right: 20 }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <MenuItem>
                    <Link component={RouterLink} to="/user" style={{ textDecoration: "none", color: "inherit" }}>Profile</Link>
                </MenuItem>
                <MenuItem onClick={handleClose}>Settings</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
        </>
    );
};

export default BoardUserButton;
