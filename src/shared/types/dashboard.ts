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

export interface CustomerContractParty {
  id: number;
  name: string;
}

export interface CustomerResolvedCustomer extends CustomerContractParty {
  source?: 'project_participant' | 'project_owner';
}

export interface CustomerContractItem {
  id: number;
  number: string;
  subject: string | null;
  status: string;
  status_label?: string | null;
  project: {
    id: number;
    name: string;
    location?: string | null;
  } | null;
  projects?: Array<{
    id: number;
    name: string;
  }>;
  contractor: CustomerContractParty | null;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  performed_amount: number;
  paid_amount: number;
  remaining_amount: number | null;
  is_self_execution: boolean;
  contract_category: string | null;
  customer: CustomerResolvedCustomer | null;
}

export interface ApprovalItem {
  id: number;
  title: string;
  projectName: string;
  contractId?: number | null;
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
