import { PendingVerificationState } from '@shared/types/auth';

const TOKEN_KEY = 'prohelper_customers.token';
const USER_KEY = 'prohelper_customers.user';
const PENDING_KEY = 'prohelper_customers.pending_verification';
const CHANGE_EVENT = 'customer-auth:changed';

let memoryToken: string | null = null;

function emitChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getAuthStorageChangeEvent() {
  return CHANGE_EVENT;
}

export function saveSession(token: string, user: unknown) {
  memoryToken = token;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.removeItem(PENDING_KEY);
  emitChange();
}

export function savePendingVerification(state: PendingVerificationState) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(state));
  emitChange();
}

export function clearPendingVerification() {
  sessionStorage.removeItem(PENDING_KEY);
  emitChange();
}

export function clearSession() {
  memoryToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  emitChange();
}

export function getStoredToken() {
  if (memoryToken) {
    return memoryToken;
  }

  const token = sessionStorage.getItem(TOKEN_KEY);
  memoryToken = token;

  return token;
}

export function getStoredUser<T>() {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function getPendingVerification<T = PendingVerificationState>() {
  const raw = sessionStorage.getItem(PENDING_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
