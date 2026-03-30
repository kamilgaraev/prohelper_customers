import axios from 'axios';

import { customerApi } from '@shared/api/customerApi';
import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { clearSession, saveSession } from '@shared/api/storage';
import { env } from '@shared/config/env';
import { ApiEnvelope } from '@shared/types/api';
import { AuthSession, CustomerRole, CustomerUser, LoginPayload, RegisterPayload } from '@shared/types/auth';

interface LandingAuthResponseData {
  token?: string;
}

interface CustomerProfileResponseData {
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    organization_id?: number | null;
    organization_name?: string | null;
    roles?: string[];
    interfaces?: string[];
  };
}

function isCustomerRole(role: string): role is CustomerRole {
  return (
    role === 'customer_owner' ||
    role === 'customer_manager' ||
    role === 'customer_approver' ||
    role === 'customer_viewer'
  );
}

function resolveCustomerRoles(roles: string[] | undefined): CustomerRole[] {
  const customerRoles = (roles ?? []).filter(isCustomerRole);

  return customerRoles.length > 0 ? customerRoles : ['customer_viewer'];
}

function resolveCustomerInterfaces(interfaces: string[] | undefined): string[] {
  const values = interfaces?.length ? interfaces : [];

  if (!values.includes('customer')) {
    values.push('customer');
  }

  return Array.from(new Set(values));
}

function buildCustomerUser(profile: CustomerProfileResponseData['user']): CustomerUser {
  const roles = resolveCustomerRoles(profile.roles);

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? null,
    accountType: 'organization',
    companyName: profile.organization_name ?? 'Customer account',
    organizationId: profile.organization_id ?? null,
    role: roles[0],
    roles,
    interfaces: resolveCustomerInterfaces(profile.interfaces)
  };
}

async function fetchCustomerSession(token: string): Promise<AuthSession> {
  const response = await customerApi.get<ApiEnvelope<CustomerProfileResponseData>>('/profile', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = extractApiData(response.data);

  return {
    token,
    user: buildCustomerUser(data.user)
  };
}

function extractLandingToken(payload: ApiEnvelope<LandingAuthResponseData>): string {
  const data = extractApiData(payload);

  if (!data.token) {
    throw new Error('Сервер не вернул токен авторизации');
  }

  return data.token;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    try {
      const response = await axios.post<ApiEnvelope<LandingAuthResponseData>>(
        `${env.customerAuthUrl}/login`,
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      const session = await fetchCustomerSession(extractLandingToken(response.data));

      saveSession(session.token, session.user);

      return session;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось выполнить вход'));
    }
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    try {
      const response = await axios.post<ApiEnvelope<LandingAuthResponseData>>(
        `${env.customerAuthUrl}/register`,
        {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          password_confirmation: payload.password,
          organization_name: payload.companyName
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      const session = await fetchCustomerSession(extractLandingToken(response.data));

      saveSession(session.token, session.user);

      return session;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось зарегистрировать customer-профиль'));
    }
  },

  logout() {
    clearSession();
  },

  async verifyEmail(params: { id: string; hash: string; expires?: string | null }) {
    const query = new URLSearchParams();

    if (params.expires) {
      query.set('expires', params.expires);
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : '';

    return axios.get<ApiEnvelope<{ verified: boolean }>>(
      `${env.customerAuthUrl}/email/verify/${params.id}/${params.hash}${suffix}`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
