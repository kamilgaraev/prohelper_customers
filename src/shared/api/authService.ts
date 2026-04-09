import axios from 'axios';

import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { customerApi } from '@shared/api/customerApi';
import {
  clearPendingVerification,
  clearSession,
  getStoredToken,
  savePendingVerification,
  saveSession
} from '@shared/api/storage';
import { env } from '@shared/config/env';
import { ApiEnvelope } from '@shared/types/api';
import {
  AuthSession,
  CustomerRole,
  CustomerUser,
  ForgotPasswordPayload,
  InvitationResolution,
  LoginPayload,
  OnboardingResult,
  PendingVerificationState,
  RegisterPayload,
  ResetPasswordPayload
} from '@shared/types/auth';

interface LoginResponseData {
  token?: string;
  user: CustomerProfile;
  organization?: {
    id: number;
    name: string;
  };
  email_verified?: boolean;
  available_interfaces?: string[];
}

interface RegisterResponseData {
  status: 'verification_required';
  email: string;
  can_enter_portal?: boolean;
  user?: {
    id?: number;
    name: string;
    email: string;
  };
  organization?: {
    id: number;
    name: string;
  };
}

interface CustomerProfileEnvelope {
  user: CustomerProfile;
}

interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  organization_id?: number | null;
  organization_name?: string | null;
  roles?: string[];
  interfaces?: string[];
}

interface VerificationResponseData {
  verified: boolean;
  email?: string;
  can_enter_portal?: boolean;
}

interface InvitationResolveResponseData {
  invitation: {
    token: string;
    status: string;
    role: string;
    email?: string | null;
    organization?: {
      id?: number | null;
      name?: string | null;
      inn?: string | null;
    };
    project?: {
      id?: number | null;
      name?: string | null;
    };
    next_action: 'login' | 'login_or_register' | 'unavailable';
    expires_at?: string | null;
  };
}

function isCustomerRole(role: string): role is CustomerRole {
  return (
    role === 'customer_owner' ||
    role === 'customer_manager' ||
    role === 'customer_approver' ||
    role === 'customer_viewer' ||
    role === 'customer_curator' ||
    role === 'customer_financier' ||
    role === 'customer_legal' ||
    role === 'customer_observer'
  );
}

function resolveCustomerRoles(roles: string[] | undefined): CustomerRole[] {
  const customerRoles = (roles ?? []).filter(isCustomerRole);

  return customerRoles.length > 0 ? customerRoles : ['customer_viewer'];
}

function resolveCustomerInterfaces(interfaces: string[] | undefined): string[] {
  const values = interfaces?.length ? [...interfaces] : [];

  if (!values.includes('customer')) {
    values.push('customer');
  }

  return Array.from(new Set(values));
}

function buildCustomerUser(profile: CustomerProfile): CustomerUser {
  const roles = resolveCustomerRoles(profile.roles);

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? null,
    accountType: 'organization',
    companyName: profile.organization_name ?? 'Кабинет заказчика',
    organizationId: profile.organization_id ?? null,
    role: roles[0],
    roles,
    interfaces: resolveCustomerInterfaces(profile.interfaces)
  };
}

function buildPendingVerificationState(data: RegisterResponseData): PendingVerificationState {
  return {
    status: 'verification_required',
    email: data.email,
    canEnterPortal: Boolean(data.can_enter_portal),
    user: data.user
      ? {
          name: data.user.name,
          email: data.user.email,
          companyName: data.organization?.name ?? 'Кабинет заказчика'
        }
      : undefined
  };
}

async function fetchCustomerSession(token: string): Promise<AuthSession> {
  const [profileResponse, verificationResponse] = await Promise.all([
    customerApi.get<ApiEnvelope<CustomerProfileEnvelope>>('/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    axios.get<ApiEnvelope<VerificationResponseData>>(`${env.customerAuthUrl}/email/check`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  ]);

  const profileData = extractApiData(profileResponse.data);
  const verificationData = extractApiData(verificationResponse.data);
  const user = buildCustomerUser(profileData.user);

  return {
    token,
    user,
    emailVerified: verificationData.verified,
    availableInterfaces: user.interfaces
  };
}

function persistSession(session: AuthSession) {
  clearPendingVerification();
  saveSession(session.token, session.user);
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession | PendingVerificationState> {
    try {
      const response = await axios.post<ApiEnvelope<LoginResponseData>>(
        `${env.customerAuthUrl}/login`,
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      const data = extractApiData(response.data);

      if (!data.token) {
        throw new Error('Сервер не вернул токен авторизации.');
      }

      const session = await fetchCustomerSession(data.token);

      persistSession(session);

      return session;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403 && error.response.data?.email_verified === false) {
        const pendingState: PendingVerificationState = {
          status: 'verification_required',
          email: error.response.data?.email ?? payload.email,
          canEnterPortal: Boolean(error.response.data?.can_enter_portal)
        };

        savePendingVerification(pendingState);

        return pendingState;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось выполнить вход.'));
    }
  },

  async register(payload: RegisterPayload): Promise<OnboardingResult> {
    try {
      const response = await axios.post<ApiEnvelope<RegisterResponseData>>(
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
      const data = extractApiData(response.data);
      const pendingState = buildPendingVerificationState(data);

      savePendingVerification(pendingState);
      clearSession();

      return {
        status: pendingState.status,
        email: pendingState.email,
        canEnterPortal: pendingState.canEnterPortal,
        user: pendingState.user,
        organization: data.organization
      };
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось создать кабинет заказчика.'));
    }
  },

  async restoreSession(): Promise<AuthSession | null> {
    const token = getStoredToken();

    if (!token) {
      return null;
    }

    try {
      const session = await fetchCustomerSession(token);

      persistSession(session);

      return session;
    } catch {
      clearSession();
      return null;
    }
  },

  async refreshSession(): Promise<string | null> {
    const token = getStoredToken();

    if (!token) {
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

      const refreshedToken = extractApiData(response.data).token;

      if (!refreshedToken) {
        clearSession();
        return null;
      }

      const session = await fetchCustomerSession(refreshedToken);

      persistSession(session);

      return refreshedToken;
    } catch {
      clearSession();
      return null;
    }
  },

  async logout() {
    const token = getStoredToken();

    try {
      if (token) {
        await axios.post(
          `${env.customerAuthUrl}/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } finally {
      clearSession();
      clearPendingVerification();
    }
  },

  async verifyEmail(params: {
    id: string;
    hash: string;
    expires?: string | null;
    signature?: string | null;
  }) {
    const query = new URLSearchParams();

    if (params.expires) {
      query.set('expires', params.expires);
    }

    if (params.signature) {
      query.set('signature', params.signature);
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
  },

  async resendVerification(email?: string) {
    const response = await axios.post<ApiEnvelope<{ verified: boolean }>>(
      `${env.customerAuthUrl}/email/resend`,
      {
        email
      },
      {
        headers: {
          Authorization: getStoredToken() ? `Bearer ${getStoredToken()}` : undefined,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return extractApiData(response.data);
  },

  async checkVerification() {
    const response = await customerApi.get<ApiEnvelope<VerificationResponseData>>('/auth/email/check');
    return extractApiData(response.data);
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    await axios.post(`${env.customerAuthUrl}/forgot-password`, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  },

  async resetPassword(payload: ResetPasswordPayload) {
    await axios.post(
      `${env.customerAuthUrl}/reset-password`,
      {
        email: payload.email,
        token: payload.token,
        password: payload.password,
        password_confirmation: payload.password
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
  },

  async resolveInvitation(token: string): Promise<InvitationResolution> {
    const response = await axios.get<ApiEnvelope<InvitationResolveResponseData>>(
      `${env.customerApiUrl}/invitations/${token}`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    const data = extractApiData(response.data);

    return {
      token: data.invitation.token,
      status: data.invitation.status,
      role: data.invitation.role,
      email: data.invitation.email,
      organization: data.invitation.organization,
      project: data.invitation.project,
      nextAction: data.invitation.next_action,
      expiresAt: data.invitation.expires_at
    };
  },

  async declineInvitation(token: string) {
    const response = await axios.post<ApiEnvelope<{ invitation: { id: number; status: string; cancelled_at?: string | null } }>>(
      `${env.customerApiUrl}/invitations/${token}/decline`,
      {},
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return extractApiData(response.data).invitation;
  },

  async loginWithInvitation(token: string, payload: LoginPayload): Promise<AuthSession | PendingVerificationState> {
    try {
      const response = await axios.post<ApiEnvelope<LoginResponseData>>(
        `${env.customerApiUrl}/invitations/${token}/login`,
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      const data = extractApiData(response.data);

      if (!data.token) {
        throw new Error('Сервер не вернул токен авторизации.');
      }

      const session = await fetchCustomerSession(data.token);

      persistSession(session);

      return session;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403 && error.response.data?.email_verified === false) {
        const pendingState: PendingVerificationState = {
          status: 'verification_required',
          email: error.response.data?.email ?? payload.email,
          canEnterPortal: false
        };

        savePendingVerification(pendingState);

        return pendingState;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось принять приглашение.'));
    }
  },

  async registerWithInvitation(token: string, payload: RegisterPayload): Promise<OnboardingResult> {
    try {
      const response = await axios.post<ApiEnvelope<RegisterResponseData>>(
        `${env.customerApiUrl}/invitations/${token}/register`,
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
      const data = extractApiData(response.data);
      const pendingState = buildPendingVerificationState(data);

      savePendingVerification(pendingState);
      clearSession();

      return {
        status: pendingState.status,
        email: pendingState.email,
        canEnterPortal: pendingState.canEnterPortal,
        user: pendingState.user,
        organization: data.organization
      };
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось создать аккаунт по приглашению.'));
    }
  }
};
