import React from 'react';
import { Outlet } from 'react-router-dom';

export const NotFound = (): JSX.Element => {
  const isElectron = window.location.protocol === 'file:';
  // window
  
  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '50px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '72px', color: '#ff6b6b' }}>404</h1>
      <p style={{ fontSize: '24px', color: '#555' }}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <p style={{ fontSize: '24px', color: '#555' }}>
        Please check the URL or go back to the homepage.
      </p>
      <p style={{ fontSize: '20px', color: '#888' }}>
        Requested URL: <strong>{window.location.pathname}</strong>
      </p>
      <br />
      <a
        href={isElectron ? '/index.html' : '/'}
        style={{
          marginTop: '20px',
          display: 'inline-block',
          padding: '10px 20px',
          fontSize: '18px',
          color: '#fff',
          backgroundColor: '#007bff',
          textDecoration: 'none',
          borderRadius: '5px',
        }}
      >
        Go Back Home
      </a>
      <Outlet />
    </div>
  );
};

export default NotFound;
