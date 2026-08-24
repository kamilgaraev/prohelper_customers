import { PendingVerificationState } from '@shared/types/auth';

const PENDING_KEY = 'most.customer.pending_verification';

interface MemorySession {
  token: string;
  csrfToken: string;
  user: unknown;
}

let memorySession: MemorySession | null = null;

export function saveSession(token: string, csrfToken: string, user: unknown) {
  memorySession = { token, csrfToken, user };
  sessionStorage.removeItem(PENDING_KEY);
}

export function updateSessionTokens(token: string, csrfToken: string) {
  if (!memorySession) {
    memorySession = { token, csrfToken, user: null };
    return;
  }

  memorySession = { ...memorySession, token, csrfToken };
}

export function savePendingVerification(state: PendingVerificationState) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(state));
}

export function clearPendingVerification() {
  sessionStorage.removeItem(PENDING_KEY);
}

export function clearSession() {
  memorySession = null;
}

export function getStoredToken() {
  return memorySession?.token ?? null;
}

export function getStoredCsrfToken() {
  return memorySession?.csrfToken ?? null;
}

export function getStoredUser<T>() {
  return (memorySession?.user as T | null) ?? null;
}

export function getPendingVerification<T = PendingVerificationState>() {
  const raw = sessionStorage.getItem(PENDING_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
