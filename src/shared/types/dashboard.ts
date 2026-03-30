export interface DashboardMetric {
  label: string;
  value: string;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
}

export interface ProjectPreview {
  id: number;
  name: string;
  location: string;
  phase: string;
  completion: number;
  budgetLabel: string;
  leadLabel: string;
}

export interface ProjectDetails extends ProjectPreview {
  status: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ApprovalItem {
  id: number;
  title: string;
  projectName: string;
  deadlineLabel: string;
  status: 'pending' | 'changes_requested' | 'approved';
}

export interface ConversationItem {
  id: number;
  title: string;
  projectName: string;
  lastMessage: string;
  unreadCount: number;
}

export interface DocumentItem {
  id: number;
  title: string;
  projectName: string | null;
  uploadedAtLabel: string | null;
  type: string | null;
  category: string | null;
  size: number | null;
  path: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAtLabel: string | null;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
  statusLabel: string;
  isUnread: boolean;
}

export interface SupportRequestPayload {
  subject: string;
  message: string;
  phone?: string;
}

export interface SupportRequestItem {
  id: number;
  status: string;
  statusLabel: string;
  subject: string;
  message: string;
  phone: string | null;
  createdAt: string | null;
  createdAtLabel: string | null;
}

export type SupportRequestResult = SupportRequestItem;
