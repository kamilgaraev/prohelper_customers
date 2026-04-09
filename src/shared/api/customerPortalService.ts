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
  CustomerOrganizationSearchItem,
  CustomerProjectParticipantsResponse,
  CustomerProjectInvitationRegistryItem,
  CustomerRequestItem,
  CustomerTeamMemberDetailsResponse,
  CustomerTeamResponse,
  DashboardData,
  DisciplineSummary,
  DocumentItem,
  FinanceSummaryResponse,
  NotificationCenterMeta,
  NotificationItem,
  NotificationSettings,
  PaginatedCustomerContractsResponse,
  ProjectDetails,
  ProjectPreview,
  ProjectRiskItem,
  ProjectTimelineItem,
  ProjectWorkspaceResponse,
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

interface NotificationFilters {
  unread?: boolean;
  event_type?: string;
}

interface NotificationCenterResponse {
  items: NotificationItem[];
  meta: NotificationCenterMeta;
}

interface IssueFilters {
  project_id?: number;
  status?: string;
  issue_reason?: string;
  due_state?: 'overdue';
}

interface RequestFilters {
  project_id?: number;
  status?: string;
  request_type?: string;
  due_state?: 'overdue';
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

function sanitizeParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<T>;
}

function sanitizeContractFilters(filters: CustomerContractsFilters = {}): CustomerContractsFilters {
  return sanitizeParams(filters) as CustomerContractsFilters;
}

export const customerPortalService = {
  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await customerApi.get<ApiEnvelope<DashboardData>>('/dashboard');
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить обзор кабинета заказчика'));
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

  async createProject(payload: {
    name: string;
    address?: string;
    description?: string;
    customer?: string;
    designer?: string;
    start_date?: string;
    end_date?: string;
    status?: 'active' | 'completed' | 'paused' | 'cancelled';
    budget_amount?: number;
    site_area_m2?: number;
    contract_number?: string;
  }): Promise<ProjectDetails> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ project: ProjectDetails }>>('/projects', payload);
      return extractApiData(response.data).project;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось создать проект'));
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

  async getProjectWorkspace(projectId: number): Promise<ProjectWorkspaceResponse['workspace'] | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<ProjectWorkspaceResponse>>(`/projects/${projectId}/workspace`);
      return extractApiData(response.data).workspace;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить рабочее пространство проекта'));
    }
  },

  async getProjectTimeline(projectId: number): Promise<{ items: ProjectTimelineItem[]; meta: { project_id: number; total: number } } | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: ProjectTimelineItem[]; meta: { project_id: number; total: number } }>>(
        `/projects/${projectId}/timeline`
      );
      return extractApiData(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить таймлайн проекта'));
    }
  },

  async getProjectRisks(projectId: number): Promise<ProjectRiskItem | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ risk: ProjectRiskItem }>>(`/projects/${projectId}/risks`);
      return extractApiData(response.data).risk;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить риски проекта'));
    }
  },

  async getProjectParticipants(projectId: number): Promise<CustomerProjectParticipantsResponse | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerProjectParticipantsResponse>>(`/projects/${projectId}/participants`);
      return extractApiData(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить участников проекта'));
    }
  },

  async createProjectInvitation(
    projectId: number,
    payload: {
      role: 'general_contractor' | 'contractor';
      organization_id?: number;
      organization_name?: string;
      email?: string;
      inn?: string;
      contact_name?: string;
      phone?: string;
      message?: string;
    }
  ) {
    try {
      const response = await customerApi.post<
        ApiEnvelope<{ invitation: CustomerProjectParticipantsResponse['invitations'][number] }>
      >(`/projects/${projectId}/participants/invitations`, payload);
      return extractApiData(response.data).invitation;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось отправить приглашение'));
    }
  },

  async cancelProjectInvitation(projectId: number, invitationId: number) {
    try {
      const response = await customerApi.post<
        ApiEnvelope<{ invitation: CustomerProjectParticipantsResponse['invitations'][number] }>
      >(`/projects/${projectId}/participants/invitations/${invitationId}/cancel`);
      return extractApiData(response.data).invitation;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось отменить приглашение'));
    }
  },

  async resendProjectInvitation(projectId: number, invitationId: number) {
    try {
      const response = await customerApi.post<
        ApiEnvelope<{ invitation: CustomerProjectParticipantsResponse['invitations'][number] }>
      >(`/projects/${projectId}/participants/invitations/${invitationId}/resend`);
      return extractApiData(response.data).invitation;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось отправить приглашение повторно'));
    }
  },

  async searchProjectOrganizations(
    projectId: number,
    params: {
      query: string;
      role: 'general_contractor' | 'contractor';
    }
  ): Promise<CustomerOrganizationSearchItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerOrganizationSearchItem[] }>>(
        `/projects/${projectId}/participants/search-organizations`,
        {
          params: sanitizeParams(params),
        }
      );
      return extractApiData(response.data).items ?? [];
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось выполнить поиск организаций.'));
    }
  },

  async getProjectInvitations(): Promise<CustomerProjectInvitationRegistryItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerProjectInvitationRegistryItem[] }>>(
        '/projects/invitations'
      );
      return extractApiData(response.data).items ?? [];
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить приглашения по проектам.'));
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

  async getDisciplineAnalytics(): Promise<DisciplineSummary> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ summary: DisciplineSummary }>>('/analytics/discipline');
      return extractApiData(response.data).summary;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить аналитику дисциплины'));
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

  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationCenterResponse> {
    try {
      const response = await customerApi.get<ApiEnvelope<NotificationCenterResponse>>('/notifications', {
        params: sanitizeParams(filters),
      });
      return extractApiData(response.data);
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось загрузить уведомления'));
    }
  },

  async getIssues(filters: IssueFilters = {}): Promise<CustomerIssueItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerIssueItem[] }>>('/issues', {
        params: sanitizeParams(filters),
      });
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

  async getRequests(filters: RequestFilters = {}): Promise<CustomerRequestItem[]> {
    try {
      const response = await customerApi.get<ApiEnvelope<{ items: CustomerRequestItem[] }>>('/requests', {
        params: sanitizeParams(filters),
      });
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

  async resolveRequest(
    requestId: number,
    status: 'accepted' | 'in_progress' | 'waiting_customer' | 'completed' | 'rejected'
  ): Promise<CustomerRequestItem> {
    try {
      const response = await customerApi.post<ApiEnvelope<{ request: CustomerRequestItem }>>(`/requests/${requestId}/resolve`, { status });
      return extractApiData(response.data).request;
    } catch (error) {
      throw new Error(resolveApiMessage(error, 'Не удалось обновить статус запроса'));
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

  async getTeamMember(memberId: number): Promise<CustomerTeamMemberDetailsResponse['member'] | null> {
    try {
      const response = await customerApi.get<ApiEnvelope<CustomerTeamMemberDetailsResponse>>(`/team/${memberId}`);
      return extractApiData(response.data).member;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw new Error(resolveApiMessage(error, 'Не удалось загрузить карточку участника'));
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
