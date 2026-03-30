import { customerApi } from '@shared/api/customerApi';
import { mockApprovals, mockConversations, mockMetrics, mockProjects } from '@shared/api/mockData';
import { ApprovalItem, ConversationItem, DashboardMetric, ProjectPreview } from '@shared/types/dashboard';

function sleep<T>(value: T, delay = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), delay);
  });
}

export const customerPortalService = {
  async getMetrics(): Promise<DashboardMetric[]> {
    try {
      const response = await customerApi.get('/dashboard');
      return response.data?.data?.metrics ?? mockMetrics;
    } catch (_error) {
      return sleep(mockMetrics);
    }
  },

  async getProjects(): Promise<ProjectPreview[]> {
    try {
      const response = await customerApi.get('/projects');
      return response.data?.data?.projects ?? mockProjects;
    } catch (_error) {
      return sleep(mockProjects);
    }
  },

  async getProject(projectId: number): Promise<ProjectPreview | null> {
    const projects = await this.getProjects();
    return projects.find((project) => project.id === projectId) ?? null;
  },

  async getApprovals(): Promise<ApprovalItem[]> {
    try {
      const response = await customerApi.get('/approvals');
      return response.data?.data?.items ?? mockApprovals;
    } catch (_error) {
      return sleep(mockApprovals);
    }
  },

  async getConversations(): Promise<ConversationItem[]> {
    try {
      const response = await customerApi.get('/conversations');
      return response.data?.data?.items ?? mockConversations;
    } catch (_error) {
      return sleep(mockConversations);
    }
  }
};
