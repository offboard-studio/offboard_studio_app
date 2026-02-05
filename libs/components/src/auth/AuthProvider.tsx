import React, { createContext, useContext, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { IAuthService, IAuthUser } from '../core/interfaces/auth.service.interface';
import { firebaseAuthService } from '../infrastructure/firebase/firebase.auth.service';
import { LoadingSpinner } from '../components/loading';
import { THEME_COLORS } from '../core/constants';

interface AuthContextType {
  user: IAuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  authService: IAuthService;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => { },
  authService: firebaseAuthService,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = firebaseAuthService;

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authService]);

  const logout = async () => {
    await authService.signOut();
  };

  const value = {
    user,
    loading,
    logout,
    authService,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: THEME_COLORS.background,
          }}
        >
          <LoadingSpinner message="Loading Offboard Studio..." size="large" />
        </Box>
      ) : children}
    </AuthContext.Provider>
  );
};
