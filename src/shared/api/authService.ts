import axios from 'axios';

import { clearSession, saveSession } from '@shared/api/storage';
import { env } from '@shared/config/env';
import { mockCustomerUser } from '@shared/api/mockData';
import { AuthSession, LoginPayload, RegisterPayload } from '@shared/types/auth';

function buildMockSession(name?: string, email?: string): AuthSession {
  return {
    token: 'demo-customer-token',
    user: {
      ...mockCustomerUser,
      name: name ?? mockCustomerUser.name,
      email: email ?? mockCustomerUser.email
    }
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    try {
      const response = await axios.post(`${env.landingAuthUrl}/login`, payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const token = response.data?.data?.token ?? response.data?.token;
      const user = response.data?.data?.user ?? response.data?.user;

      if (!token || !user) {
        throw new Error('Неверный формат ответа авторизации');
      }

      const session: AuthSession = {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountType: 'organization',
          companyName: user.organization?.name ?? 'Customer account',
          role: 'customer_owner',
          interfaces: ['customer']
        }
      };

      saveSession(session.token, session.user);

      return session;
    } catch (_error) {
      const session = buildMockSession(undefined, payload.email);
      saveSession(session.token, session.user);
      return session;
    }
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const session = buildMockSession(payload.name, payload.email);
    saveSession(session.token, {
      ...session.user,
      companyName: payload.companyName
    });

    return {
      ...session,
      user: {
        ...session.user,
        companyName: payload.companyName
      }
    };
  },

  logout() {
    clearSession();
  }
};

