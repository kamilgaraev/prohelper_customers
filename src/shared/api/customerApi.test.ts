import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  customerCall: vi.fn()
}));

vi.mock('axios', () => {
  const instance = Object.assign(mocks.customerCall, {
    interceptors: {
      request: { use: mocks.requestUse },
      response: { use: mocks.responseUse }
    }
  });
  const axios = Object.assign(vi.fn(), {
    create: vi.fn(() => instance),
    get: mocks.get,
    post: mocks.post,
    isAxiosError: (error: unknown) => Boolean((error as { __isAxiosError?: boolean })?.__isAxiosError)
  });

  return { default: axios };
});

import { refreshCustomerTokens } from '@shared/api/customerApi';
import {
  clearSession,
  getStoredCsrfToken,
  getStoredToken,
  saveSession
} from '@shared/api/storage';

describe('customerApi', () => {
  beforeEach(() => {
    const makeStorage = () => {
      const values = new Map<string, string>();

      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear()
      };
    };
    Object.defineProperty(globalThis, 'sessionStorage', { value: makeStorage(), configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: makeStorage(), configurable: true });
    mocks.get.mockReset();
    mocks.post.mockReset();
    clearSession();
  });

  it('adds memory access and CSRF tokens without Web Storage persistence', () => {
    saveSession('access-token', 'csrf-token', { id: 1 });
    const requestInterceptor = mocks.requestUse.mock.calls[0][0] as (config: Record<string, unknown>) => {
      headers: Record<string, string>;
    };
    const config = requestInterceptor({ method: 'post', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer access-token');
    expect(config.headers['X-CSRF-Token']).toBe('csrf-token');
    expect(sessionStorage.getItem('prohelper_customers.token')).toBeNull();
    expect(localStorage.getItem('prohelper_customers.token')).toBeNull();
  });

  it('coalesces concurrent refreshes and uses the HttpOnly cookie with CSRF', async () => {
    mocks.get.mockResolvedValue({
      data: { success: true, data: { csrf_token: 'refresh-csrf' } }
    });
    mocks.post.mockResolvedValue({
      data: {
        success: true,
        data: { token: 'next-access', csrf_token: 'next-csrf' }
      }
    });

    const [first, second] = await Promise.all([
      refreshCustomerTokens(),
      refreshCustomerTokens()
    ]);

    expect(first).toEqual(second);
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.get.mock.calls[0][1]).toMatchObject({ withCredentials: true });
    expect(mocks.post.mock.calls[0][2]).toMatchObject({
      withCredentials: true,
      headers: { 'X-CSRF-Token': 'refresh-csrf' }
    });
    expect(getStoredToken()).toBe('next-access');
    expect(getStoredCsrfToken()).toBe('next-csrf');
  });
});
