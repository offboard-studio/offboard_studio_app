import React, { createContext, useContext, useEffect, useState } from 'react';
import { IAuthService, IAuthUser } from '../core/interfaces/auth.service.interface';
import { firebaseAuthService } from '../infrastructure/firebase/firebase.auth.service';

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
    console.log("AuthProvider: Initializing auth listener...");
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      console.log("AuthProvider: Auth state changed:", currentUser ? "User logged in" : "No user");
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
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'sans-serif'
        }}>
          <h2>Loading Offboard Studio...</h2>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
