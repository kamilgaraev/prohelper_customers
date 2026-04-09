import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@shared/api/authService';
import {
  getAuthStorageChangeEvent,
  getPendingVerification,
  getStoredToken,
  getStoredUser
} from '@shared/api/storage';
import {
  AuthSession,
  AuthSessionStatus,
  CustomerUser,
  LoginPayload,
  OnboardingResult,
  PendingVerificationState,
  RegisterPayload
} from '@shared/types/auth';

interface AuthContextValue {
  user: CustomerUser | null;
  token: string | null;
  status: AuthSessionStatus;
  pendingVerification: PendingVerificationState | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession | PendingVerificationState>;
  register: (payload: RegisterPayload) => Promise<OnboardingResult>;
  logout: () => Promise<void>;
  completeVerification: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthSessionStatus>('guest');
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);

      const storedToken = getStoredToken();
      const storedUser = getStoredUser<CustomerUser>();
      const pending = getPendingVerification<PendingVerificationState>();

      if (!cancelled) {
        setPendingVerification(pending);
      }

      if (!storedToken || !storedUser) {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setStatus(pending ? 'pending_verification' : 'guest');
          setIsLoading(false);
        }

        return;
      }

      const session = await authService.restoreSession();

      if (cancelled) {
        return;
      }

      if (!session) {
        setToken(null);
        setUser(null);
        setStatus(pending ? 'pending_verification' : 'guest');
        setIsLoading(false);
        return;
      }

      setToken(session.token);
      setUser(session.user);
      setPendingVerification(null);
      setStatus(session.emailVerified ? 'authenticated' : 'pending_verification');
      setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      const nextToken = getStoredToken();
      const nextUser = getStoredUser<CustomerUser>();
      const nextPending = getPendingVerification<PendingVerificationState>();

      setToken(nextToken);
      setUser(nextUser);
      setPendingVerification(nextPending);

      if (nextToken && nextUser) {
        setStatus('authenticated');
        return;
      }

      setStatus(nextPending ? 'pending_verification' : 'guest');
    };

    window.addEventListener(getAuthStorageChangeEvent(), handler);

    return () => {
      window.removeEventListener(getAuthStorageChangeEvent(), handler);
    };
  }, []);

  async function handleSession(factory: Promise<AuthSession | PendingVerificationState>) {
    setIsLoading(true);

    try {
      const result = await factory;

      if ('token' in result) {
        setToken(result.token);
        setUser(result.user);
        setPendingVerification(null);
        setStatus(result.emailVerified ? 'authenticated' : 'pending_verification');
        return result;
      }

      setToken(null);
      setUser(null);
      setPendingVerification(result);
      setStatus('pending_verification');

      return result;
    } finally {
      setIsLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      pendingVerification,
      isAuthenticated: status === 'authenticated' && Boolean(user && token),
      isLoading,
      login: async (payload) => handleSession(authService.login(payload)),
      register: async (payload) => {
        setIsLoading(true);

        try {
          const result = await authService.register(payload);
          const nextPending: PendingVerificationState = {
            status: result.status,
            email: result.email,
            canEnterPortal: result.canEnterPortal,
            user: result.user
          };

          setToken(null);
          setUser(null);
          setPendingVerification(nextPending);
          setStatus('pending_verification');

          return result;
        } finally {
          setIsLoading(false);
        }
      },
      logout: async () => {
        setIsLoading(true);

        try {
          await authService.logout();
          setToken(null);
          setUser(null);
          setStatus(pendingVerification ? 'pending_verification' : 'guest');
        } finally {
          setIsLoading(false);
        }
      },
      completeVerification: () => {
        setPendingVerification(null);
        setStatus(token && user ? 'authenticated' : 'guest');
      }
    }),
    [isLoading, pendingVerification, status, token, user]
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
