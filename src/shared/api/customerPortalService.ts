import axios from 'axios';

import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { customerApi } from '@shared/api/customerApi';
import { ApiEnvelope } from '@shared/types/api';
import { CustomerRole, CustomerUser } from '@shared/types/auth';
import {
  ApprovalItem,
  ConversationItem,
  CustomerContractsFilters,
  CustomerContractItem,
  CustomerIssueItem,
  CustomerRequestItem,
  CustomerTeamResponse,
  DashboardData,
  DocumentItem,
  FinanceSummaryResponse,
  NotificationItem,
  NotificationSettings,
  PaginatedCustomerContractsResponse,
  ProjectDetails,
  ProjectPreview,
  SupportRequestItem,
  SupportRequestPayload,
  SupportRequestResult,
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
    role === 'customer_viewer' ||
    role === 'customer_curator' ||
    role === 'customer_financier' ||
    role === 'customer_legal' ||
    role === 'customer_observer'
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
    interfaces: Array.from(new Set(interfaces)),
  };
}

function sanitizeContractFilters(filters: CustomerContractsFilters = {}): CustomerContractsFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as CustomerContractsFilters;
}

export const customerPortalService = {
  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await customerApi.get<ApiEnvelope<DashboardData>>('/dashboard');
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить обзор customer-кабинета'));
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
      const response = await customerApi.get<ApiEnvelope<{ project: ProjectDetails }>>(`/projects/${projectId}`);
      return extractApiData(response.data).project;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить проект'));
    }
  },

  async getContracts(filters: CustomerContractsFilters = {}): Promise<PaginatedCustomerContractsResponse> {
    try {
      const response = await customerApi.get<ApiEnvelope<PaginatedCustomerContractsResponse>>('/contracts', {
        params: sanitizeContractFilters(filters),
      });
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить договоры'));
    }
  },

  async getProjectContracts(projectId: number, filters: CustomerContractsFilters = {}): Promise<PaginatedCustomerContractsResponse> {
    try {
      const response = await customerApi.get<ApiEnvelope<PaginatedCustomerContractsResponse>>(
        `/projects/${projectId}/contracts`,
        { params: sanitizeContractFilters(filters) }
      );
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить договоры проекта'));
    }
  },

  async getContract(contractId: number): Promise<CustomerContractItem | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ contract: CustomerContractItem }>>(`/contracts/${contractId}`);
      return extractApiData(response.data).contract;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить договор'));
    }
  },

  async getFinanceSummary(): Promise<FinanceSummaryResponse['summary'] | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<FinanceSummaryResponse>>('/finance/summary');
      return extractApiData(response.data).summary;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить финансовую сводку'));
    }
  },

  async getProjectFinanceSummary(projectId: number): Promise<FinanceSummaryResponse['summary'] | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<FinanceSummaryResponse>>(`/projects/${projectId}/finance`);
      return extractApiData(response.data).summary;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить финансы проекта'));
    }
  },

  async getProjectDocuments(projectId: number): Promise<DocumentItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: DocumentItem[] }>>(`/projects/${projectId}/documents`);
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить документы проекта'));
    }
  },

  async getProjectApprovals(projectId: number): Promise<ApprovalItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ApprovalItem[] }>>(`/projects/${projectId}/approvals`);
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить согласования проекта'));
    }
  },

  async getProjectConversations(projectId: number): Promise<ConversationItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ConversationItem[] }>>(`/projects/${projectId}/conversations`);
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить коммуникации проекта'));
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
      const response = await customerApi.get<ApiEnvelope<{ items: ConversationItem[] }>>('/conversations');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить коммуникации'));
    }
  },

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: NotificationItem[] }>>('/notifications');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить уведомления'));
    }
  },

  async getIssues(): Promise<CustomerIssueItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerIssueItem[] }>>('/issues');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить замечания'));
    }
  },

  async createIssue(payload: {
    title: string;
    issue_reason: string;
    body: string;
    project_id?: number;
    contract_id?: number;
    performance_act_id?: number;
    file_id?: number;
    due_date?: string;
    attachments?: Array<{ label?: string; url?: string }>;
  }): Promise<CustomerIssueItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ issue: CustomerIssueItem }>>('/issues', payload);
      return extractApiData(response.data).issue;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось создать замечание'));
    }
  },

  async getIssue(issueId: number): Promise<CustomerIssueItem | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ issue: CustomerIssueItem }>>(`/issues/${issueId}`);
      return extractApiData(response.data).issue;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить замечание'));
    }
  },

  async addIssueComment(issueId: number, payload: { body: string; attachments?: Array<{ label?: string; url?: string }> }): Promise<CustomerIssueItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ issue: CustomerIssueItem }>>(`/issues/${issueId}/comments`, payload);
      return extractApiData(response.data).issue;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось добавить комментарий'));
    }
  },

  async resolveIssue(issueId: number, status: 'resolved' | 'rejected'): Promise<CustomerIssueItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ issue: CustomerIssueItem }>>(`/issues/${issueId}/resolve`, { status });
      return extractApiData(response.data).issue;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось обновить статус замечания'));
    }
  },

  async getRequests(): Promise<CustomerRequestItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerRequestItem[] }>>('/requests');
      return extractApiData(response.data).items;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить запросы'));
    }
  },

  async createRequest(payload: {
    title: string;
    request_type: string;
    body: string;
    project_id?: number;
    contract_id?: number;
    due_date?: string;
    attachments?: Array<{ label?: string; url?: string }>;
  }): Promise<CustomerRequestItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ request: CustomerRequestItem }>>('/requests', payload);
      return extractApiData(response.data).request;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось создать запрос'));
    }
  },

  async getRequest(requestId: number): Promise<CustomerRequestItem | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ request: CustomerRequestItem }>>(`/requests/${requestId}`);
      return extractApiData(response.data).request;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить запрос'));
    }
  },

  async addRequestComment(requestId: number, payload: { body: string; attachments?: Array<{ label?: string; url?: string }> }): Promise<CustomerRequestItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ request: CustomerRequestItem }>>(`/requests/${requestId}/comments`, payload);
      return extractApiData(response.data).request;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось добавить комментарий'));
    }
  },

  async getTeam(): Promise<CustomerTeamResponse> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerTeamResponse>>('/team');
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить состав команды'));
    }
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ settings: NotificationSettings }>>('/notification-settings');
      return extractApiData(response.data).settings;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить настройки уведомлений'));
    }
  },

  async updateNotificationSettings(payload: NotificationSettings): Promise<NotificationSettings> {
    try {
      const response = await customerApi.put<ApiEnvelope<{ settings: NotificationSettings }>>('/notification-settings', payload);
      return extractApiData(response.data).settings;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось обновить настройки уведомлений'));
    }
  },

  async getPermissions(): Promise<PermissionsData> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerPermissionsResponseData>>('/permissions');
      const data = extractApiData(response.data);
      const interfaces = data.interfaces?.length ? [...data.interfaces] : [];

      if (!interfaces.includes('customer')) {
        interfaces.push('customer');
      }

      return {
        permissionsFlat: data.permissions_flat ?? [],
        roles: data.roles ?? [],
        interfaces: Array.from(new Set(interfaces)),
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
      const response = await customerApi.post<ApiEnvelope<{ request: SupportRequestResult }>>('/support', payload);
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
  },
};
