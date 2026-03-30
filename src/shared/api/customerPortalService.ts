import axios from 'axios';

import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { customerApi } from '@shared/api/customerApi';
import { ApiEnvelope } from '@shared/types/api';
import { CustomerRole, CustomerUser } from '@shared/types/auth';
import {
  ApprovalItem,
  ConversationItem,
  DashboardMetric,
  DocumentItem,
  NotificationItem,
  ProjectDetails,
  ProjectPreview,
  SupportRequestItem,
  SupportRequestPayload,
  SupportRequestResult
} from '@shared/types/dashboard';
import { PermissionsData } from '@shared/types/permissions';

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

interface CustomerPermissionsResponseData {
  roles?: string[];
  permissions_flat?: string[];
  interfaces?: string[];
}

function isCustomerRole(role: string): role is CustomerRole {
  return (
    role === 'customer_owner' ||
    role === 'customer_manager' ||
    role === 'customer_approver' ||
    role === 'customer_viewer'
  );
}

function normalizeCustomerUser(profile: CustomerProfileResponseData['user']): CustomerUser {
  const roles = (profile.roles ?? []).filter(isCustomerRole);
  const interfaces = profile.interfaces?.length ? [...profile.interfaces] : [];

  if (!interfaces.includes('customer')) {
    interfaces.push('customer');
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? null,
    accountType: 'organization',
    companyName: profile.organization_name ?? 'Customer account',
    organizationId: profile.organization_id ?? null,
    role: roles[0] ?? 'customer_viewer',
    roles: roles.length > 0 ? roles : ['customer_viewer'],
    interfaces: Array.from(new Set(interfaces))
  };
}

export const customerPortalService = {
  async getMetrics(): Promise<DashboardMetric[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ metrics: DashboardMetric[] }>>('/dashboard');
      return extractApiData(response.data).metrics;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить метрики портала'));
    }
  },

  async getProjects(): Promise<ProjectPreview[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ projects: ProjectPreview[] }>>('/projects');
      return extractApiData(response.data).projects;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить проекты'));
    }
  },

  async getProject(projectId: number): Promise<ProjectDetails | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ project: ProjectDetails }>>(
        `/projects/${projectId}`
      );

      return extractApiData(response.data).project;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить проект'));
    }
  },

  async getProjectDocuments(projectId: number): Promise<DocumentItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: DocumentItem[] }>>(
        `/projects/${projectId}/documents`
      );

      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить документы проекта'));
    }
  },

  async getProjectApprovals(projectId: number): Promise<ApprovalItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ApprovalItem[] }>>(
        `/projects/${projectId}/approvals`
      );

      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить согласования проекта'));
    }
  },

  async getProjectConversations(projectId: number): Promise<ConversationItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ConversationItem[] }>>(
        `/projects/${projectId}/conversations`
      );

      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить переписку по проекту'));
    }
  },

  async getDocuments(): Promise<DocumentItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: DocumentItem[] }>>('/documents');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить документы'));
    }
  },

  async getApprovals(): Promise<ApprovalItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ApprovalItem[] }>>('/approvals');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить согласования'));
    }
  },

  async getConversations(): Promise<ConversationItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ConversationItem[] }>>(
        '/conversations'
      );
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить коммуникации'));
    }
  },

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: NotificationItem[] }>>(
        '/notifications'
      );
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить уведомления'));
    }
  },

  async getPermissions(): Promise<PermissionsData> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerPermissionsResponseData>>(
        '/permissions'
      );
      const data = extractApiData(response.data);
      const interfaces = data.interfaces?.length ? [...data.interfaces] : [];

      if (!interfaces.includes('customer')) {
        interfaces.push('customer');
      }

      return {
        permissionsFlat: data.permissions_flat ?? [],
        roles: data.roles ?? [],
        interfaces: Array.from(new Set(interfaces))
      };
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить права доступа'));
    }
  },

  async getProfile(): Promise<CustomerUser> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerProfileResponseData>>('/profile');
      return normalizeCustomerUser(extractApiData(response.data).user);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить профиль'));
    }
  },

  async createSupportRequest(payload: SupportRequestPayload): Promise<SupportRequestResult> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ request: SupportRequestResult }>>(
        '/support',
        payload
      );

      return extractApiData(response.data).request;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось отправить обращение'));
    }
  },

  async getSupportRequests(): Promise<SupportRequestItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: SupportRequestItem[] }>>('/support');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить историю обращений'));
    }
  }
};
