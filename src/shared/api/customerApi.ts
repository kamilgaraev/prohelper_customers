import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { clearSession, getStoredToken, getStoredUser, saveSession } from '@shared/api/storage';
import { env } from '@shared/config/env';
import { ApiEnvelope } from '@shared/types/api';
import { CustomerUser } from '@shared/types/auth';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

async function refreshToken(): Promise<string | null> {
  const token = getStoredToken();
  const user = getStoredUser<CustomerUser>();

  if (!token || !user) {
    clearSession();
    return null;
  }

  try {
    const response = await axios.post<ApiEnvelope<{ token: string }>>(
      `${env.customerAuthUrl}/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    const nextToken = response.data.data?.token;

    if (!nextToken) {
      clearSession();
      return null;
    }

    saveSession(nextToken, user);

    return nextToken;
  } catch {
    clearSession();
    return null;
  }
}

export const customerApi = axios.create({
  baseURL: env.customerApiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

customerApi.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const nextToken = await refreshToken();

    if (!nextToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextToken}`;

    return customerApi(originalRequest);
  }
);
