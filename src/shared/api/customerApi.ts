import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import {
  clearSession,
  getStoredCsrfToken,
  getStoredToken,
  updateSessionTokens
} from '@shared/api/storage';
import { env } from '@shared/config/env';
import { ApiEnvelope } from '@shared/types/api';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

interface TokenResponse {
  token: string;
  csrf_token: string;
}

let refreshPromise: Promise<TokenResponse | null> | null = null;

export async function refreshCustomerTokens(): Promise<TokenResponse | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const csrfResponse = await axios.get<ApiEnvelope<{ csrf_token: string }>>(
        `${env.customerAuthUrl}/csrf`,
        {
          withCredentials: true,
          headers: { Accept: 'application/json' }
        }
      );
      const csrfToken = csrfResponse.data.data?.csrf_token;

      if (!csrfToken) {
        clearSession();
        return null;
      }

      const response = await axios.post<ApiEnvelope<TokenResponse>>(
        `${env.customerAuthUrl}/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          }
        }
      );
      const tokens = response.data.data;

      if (!tokens?.token || !tokens.csrf_token) {
        clearSession();
        return null;
      }

      updateSessionTokens(tokens.token, tokens.csrf_token);

      return tokens;
    } catch {
      clearSession();
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export const customerApi = axios.create({
  baseURL: env.customerApiUrl,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

customerApi.interceptors.request.use((config) => {
  const token = getStoredToken();
  const csrfToken = getStoredCsrfToken();
  const method = config.method?.toUpperCase() ?? 'GET';

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

customerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetriableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/csrf')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const tokens = await refreshCustomerTokens();

    if (!tokens) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${tokens.token}`;
    originalRequest.headers['X-CSRF-Token'] = tokens.csrf_token;

    return customerApi(originalRequest);
  }
);
