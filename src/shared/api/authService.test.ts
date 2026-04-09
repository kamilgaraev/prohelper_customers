import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedAxiosGet, mockedAxiosPost, mockedCustomerGet } = vi.hoisted(() => ({
  mockedAxiosGet: vi.fn(),
  mockedAxiosPost: vi.fn(),
  mockedCustomerGet: vi.fn()
}));

vi.mock('axios', () => ({
  default: {
    post: mockedAxiosPost,
    get: mockedAxiosGet,
    isAxiosError: (error: unknown) => Boolean((error as { __isAxiosError?: boolean })?.__isAxiosError)
  }
}));

vi.mock('@shared/api/customerApi', () => ({
  customerApi: {
    get: mockedCustomerGet,
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

import { authService } from '@shared/api/authService';

describe('authService', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        }
      },
      configurable: true
    });
    mockedAxiosGet.mockReset();
    mockedAxiosPost.mockReset();
    mockedCustomerGet.mockReset();
    sessionStorage.clear();
  });

  it('preserves extended customer roles after successful login', async () => {
    mockedAxiosPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'jwt-token'
        }
      }
    });
    mockedCustomerGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: {
            id: 12,
            name: 'Ирина Куратор',
            email: 'irina@example.com',
            organization_id: 7,
            organization_name: 'ООО Заказчик',
            roles: ['customer_curator'],
            interfaces: ['customer']
          }
        }
      }
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          verified: true,
          email: 'irina@example.com',
          can_enter_portal: true
        }
      }
    });

    const result = await authService.login({
      email: 'irina@example.com',
      password: 'Secret123'
    });

    expect('token' in result).toBe(true);

    if ('token' in result) {
      expect(result.user.role).toBe('customer_curator');
      expect(result.user.roles).toContain('customer_curator');
      expect(result.emailVerified).toBe(true);
    }
  });

  it('returns verification_required state for unverified login', async () => {
    mockedAxiosPost.mockRejectedValueOnce({
      __isAxiosError: true,
      response: {
        status: 403,
        data: {
          email_verified: false,
          email: 'pending@example.com',
          can_enter_portal: false
        }
      }
    });

    const result = await authService.login({
      email: 'pending@example.com',
      password: 'Secret123'
    });

    expect('token' in result).toBe(false);

    if (!('token' in result)) {
      expect(result.status).toBe('verification_required');
      expect(result.email).toBe('pending@example.com');
    }
  });
});
