import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api, { setAuthToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
  authModalMode: 'login',
  setAuthModalMode: () => {},
  openAuthModal: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        setLoading(true);
        const me = await api.getMe();
        if (mounted) {
          setUser(me);
        }
      } catch (err) {
        if (mounted) {
          setUser(null);
          setAuthToken(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setAuthToken(null);
      setShowAuthModal(true);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    setUser(res.user);
    setShowAuthModal(false);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.register({ email, password, name });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    setUser(res.user);
    setShowAuthModal(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Best effort
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
