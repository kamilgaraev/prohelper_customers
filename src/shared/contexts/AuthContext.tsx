import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@shared/api/authService';
import { getStoredToken, getStoredUser } from '@shared/api/storage';
import { AuthSession, CustomerUser, LoginPayload, RegisterPayload } from '@shared/types/auth';

interface AuthContextValue {
  user: CustomerUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(getStoredToken());
    setUser(getStoredUser<CustomerUser>());
    setIsLoading(false);
  }, []);

  async function handleSession(factory: Promise<AuthSession>) {
    setIsLoading(true);

    try {
      const session = await factory;
      setToken(session.token);
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login: async (payload) => {
        await handleSession(authService.login(payload));
      },
      register: async (payload) => {
        await handleSession(authService.register(payload));
      },
      logout: () => {
        authService.logout();
        setToken(null);
        setUser(null);
      }
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

