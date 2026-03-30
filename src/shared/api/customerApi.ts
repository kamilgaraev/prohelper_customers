import axios from 'axios';

import { env } from '@shared/config/env';
import { getStoredToken } from '@shared/api/storage';

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

