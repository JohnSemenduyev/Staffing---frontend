import { useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth';

const STORAGE_KEY = 'admin_portal_user';

// Mock user database
const mockUsers = [
  { id: '1', username: 'test@manager', password: 'manager@123', role: 'manager' as const, isAuth: true },
  { id: '2', username: 'test@admin', password: 'admin@123', role: 'admin' as const, isAuth: true },
];

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({ user, isAuthenticated: true });
      } catch (error) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user && user.isAuth) {
      const authUser: User = {
        id: user.id,
        username: user.username,
        role: user.role,
        isAuth: user.isAuth,
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setAuthState({ user: authUser, isAuthenticated: true });
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthState({ user: null, isAuthenticated: false });
  };

  return {
    ...authState,
    isLoading,
    login,
    logout,
  };
};