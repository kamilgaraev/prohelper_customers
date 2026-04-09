export interface DashboardMetric {
  label: string;
  value: string;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
}

export interface LinkedProjectSummary {
  id: number;
  name: string;
  location?: string | null;
}

export interface RelatedEntitySummary {
  type: string;
  id: number;
}

export interface AttentionFeedItem {
  id: string;
  type: 'contract' | 'approval' | 'issue' | 'request';
  title: string;
  subtitle?: string | null;
  status: string;
  priority: 'critical' | 'warning' | 'primary' | 'info' | 'success' | 'normal';
  project?: LinkedProjectSummary | null;
  related_entity?: RelatedEntitySummary | null;
  created_at: string | null;
}

export interface FinanceTotals {
  total_amount: number;
  performed_amount: number;
  paid_amount: number;
  remaining_amount: number;
  advance_amount: number;
  retention_amount: number;
}

export interface FinanceProjectSummary {
  project: {
    id: number;
    name: string;
  };
  totals: FinanceTotals;
  deviation: {
    planned_budget: number | null;
    contracts_total: number;
    delta: number | null;
    performed_vs_paid_delta: number;
    payment_delay_amount: number;
    problem_flags: string[];
  };
}

export interface DisciplineSummary {
  issue_response_hours: number | null;
  approval_cycle_hours: number;
  rework_count: number;
  overdue_actions_count: number;
  stalled_items_count: number;
  request_response_hours: number | null;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  attention_feed: {
    contracts: AttentionFeedItem[];
    approvals: AttentionFeedItem[];
    issues: AttentionFeedItem[];
    requests: AttentionFeedItem[];
  };
  finance_summary: {
    totals: FinanceTotals;
    projects: FinanceProjectSummary[];
  } | null;
  project_risks: ProjectRiskItem[];
  recent_changes: RecentChangeItem[];
  discipline_summary: DisciplineSummary;
}

export interface CustomerContractParty {
  id: number;
  name: string;
  entity_type?: string | null;
  organization_id?: number | null;
  organization_name?: string | null;
  is_self_execution?: boolean;
}

export interface CustomerResolvedCustomer extends CustomerContractParty {
  source?: 'project_participant' | 'project_owner';
  role?: 'customer' | 'owner';
  is_fallback_owner?: boolean;
}

export interface ProjectPreview {
  id: number;
  name: string;
  location: string;
  phase: string;
  completion: number;
  budgetLabel: string;
  leadLabel: string;
  resolved_customer?: CustomerResolvedCustomer | null;
}

export type CustomerContractSideType =
  | 'customer_to_general_contractor'
  | 'general_contractor_to_contractor'
  | 'general_contractor_to_supplier'
  | 'contractor_to_subcontractor'
  | 'contractor_to_supplier'
  | 'subcontractor_to_supplier';

export interface CustomerContractSideSummary {
  type: CustomerContractSideType | null;
  display_label: string;
  first_party: CustomerContractParty | null;
  second_party: CustomerContractParty | null;
  first_party_role_label: string | null;
  second_party_role_label: string | null;
  customer_organization?: CustomerContractParty | null;
  executor_organization?: CustomerContractParty | null;
}

export interface ProjectRiskItem {
  project: {
    id: number;
    name: string;
  };
  flags: string[];
  pending_approvals: number;
  documents_without_reaction: number;
}

export interface ProjectDetails extends ProjectPreview {
  status: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  finance_summary?: FinanceProjectSummary | null;
  key_contracts?: Array<{
    id: number;
    number: string;
    subject: string | null;
    status: string;
    total_amount: number | null;
  }>;
  problem_flags?: ProjectRiskItem | null;
}

export interface CustomerContractItem {
  id: number;
  number: string;
  subject: string | null;
  status: string;
  status_label?: string | null;
  project: LinkedProjectSummary | null;
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
  customer: CustomerContractParty | null;
  contract_side?: CustomerContractSideSummary | null;
  current_organization_role?: string | null;
  financial_summary?: {
    total_amount: number | null;
    performed_amount: number;
    paid_amount: number;
    remaining_amount: number | null;
    advance_amount: number | null;
    planned_advance_amount: number | null;
    warranty_retention_amount: number | null;
  };
  agreements_summary?: {
    count: number;
    total_change: number;
    items: Array<{
      id: number;
      number: string;
      date: string | null;
      change_amount: number | null;
    }>;
  };
  acts_summary?: {
    count: number;
    approved_count: number;
    items: Array<{
      id: number;
      number: string;
      date: string | null;
      amount: number | null;
      status: string;
    }>;
  };
  payments_summary?: {
    count: number;
    items: Array<{
      id: number;
      date: string | null;
      amount: number | null;
      type: string | null;
      reference: string | null;
    }>;
  };
  timeline?: Array<{
    type: string;
    title: string;
    date: string | null;
  }>;
}

export interface CustomerContractsFilters {
  page?: number;
  per_page?: number;
  project_id?: number;
  status?: string;
  contractor_id?: number;
  contractor_search?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaginatedCustomerContractsResponse {
  items: CustomerContractItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    filters: CustomerContractsFilters;
  };
}

export interface ApprovalItem {
  id: number;
  title: string;
  projectName: string;
  projectId?: number | null;
  contractId?: number | null;
  contractNumber?: string | null;
  contractSubject?: string | null;
  contractStatus?: string | null;
  deadlineLabel: string;
  status: 'pending' | 'changes_requested' | 'approved';
  amount?: string | null;
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
  projectId?: number | null;
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
  created_at: string | null;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
  statusLabel: string;
  isUnread: boolean;
  eventType?: string | null;
  project?: LinkedProjectSummary | null;
  related_entity?: RelatedEntitySummary | null;
  priority?: string | null;
}

export interface NotificationCenterMeta {
  organization_id: number;
  unread_count: number;
  total: number;
  filters: {
    unread?: boolean | string;
    event_type?: string;
  };
}

export interface RecentChangeItem {
  type: 'contract' | 'document' | 'issue';
  id: number;
  title: string;
  subtitle?: string | null;
  created_at: string | null;
}

export interface FinanceSummaryResponse {
  summary: {
    totals: FinanceTotals;
    projects: FinanceProjectSummary[];
  };
}

export interface WorkflowComment {
  id: number;
  body: string;
  attachments: Array<{ label?: string | null; url?: string | null }>;
  author: {
    id: number;
    name: string;
  } | null;
  created_at: string | null;
}

export interface WorkflowHistoryItem {
  type: string;
  author_id?: number | null;
  author_name?: string | null;
  created_at: string | null;
  body?: string | null;
  status?: string | null;
}

export interface WorkflowAssignee {
  id?: number | null;
  name?: string | null;
}

export interface CustomerIssueItem {
  id: number;
  title: string;
  issue_reason: string;
  body: string;
  status: string;
  status_label: string;
  due_date: string | null;
  attachments: Array<{ label?: string | null; url?: string | null }>;
  author: {
    id: number;
    name: string;
  } | null;
  resolver?: {
    id: number;
    name: string;
  } | null;
  assignee?: WorkflowAssignee | null;
  project?: {
    id: number;
    name: string;
  } | null;
  contract?: {
    id: number;
    number: string;
    subject: string | null;
  } | null;
  approval?: {
    id: number;
    number: string;
    amount: number | null;
  } | null;
  document?: {
    id: number;
    title: string;
  } | null;
  comments: WorkflowComment[];
  history?: WorkflowHistoryItem[];
  last_response_at?: string | null;
  overdue_since?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerRequestItem {
  id: number;
  title: string;
  request_type: string;
  body: string;
  status: string;
  status_label: string;
  due_date: string | null;
  attachments: Array<{ label?: string | null; url?: string | null }>;
  author: {
    id: number;
    name: string;
  } | null;
  resolver?: {
    id: number;
    name: string;
  } | null;
  assignee?: WorkflowAssignee | null;
  project?: {
    id: number;
    name: string;
  } | null;
  contract?: {
    id: number;
    number: string;
    subject: string | null;
  } | null;
  comments: WorkflowComment[];
  history?: WorkflowHistoryItem[];
  last_response_at?: string | null;
  overdue_since?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerTeamProjectAccess {
  id: number;
  name: string;
}

export interface CustomerTeamHistoryItem {
  id: number;
  action: string;
  role?: string | null;
  created_at: string | null;
}

export interface CustomerTeamMember {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_owner: boolean;
  status: 'active' | 'inactive';
  roles: string[];
  interfaces: string[];
  project_access: CustomerTeamProjectAccess[];
  has_full_project_access: boolean;
  access_history: CustomerTeamHistoryItem[];
  available_project_count: number;
}

export interface CustomerTeamMemberDetailsResponse {
  member: CustomerTeamMember;
  current_user_id: number;
}

export interface CustomerRoleCatalogItem {
  slug: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface CustomerTeamResponse {
  members: CustomerTeamMember[];
  available_roles: CustomerRoleCatalogItem[];
  current_user_id: number;
}

export interface NotificationSettings {
  channels: {
    in_app: boolean;
    email: boolean;
  };
  events: {
    new_contract: boolean;
    new_approval: boolean;
    issue_waiting_response: boolean;
    request_deadline: boolean;
    contract_amount_changed: boolean;
    new_document: boolean;
    request_status_changed: boolean;
    project_deadline_changed: boolean;
    access_updated: boolean;
    finance_risk_detected: boolean;
  };
  updated_at?: string;
  organization_id?: number;
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

export interface ProjectTimelineItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  project?: LinkedProjectSummary | null;
  related_entity?: RelatedEntitySummary | null;
  created_at: string | null;
  status: string;
  priority: string;
}

export interface ProjectWorkspaceResponse {
  workspace: {
    project: ProjectDetails;
    documents: { items: DocumentItem[] };
    approvals: { items: ApprovalItem[] };
    timeline: ProjectTimelineItem[];
    risk_center: ProjectRiskItem;
    summary: {
      documents_total: number;
      approvals_total: number;
      key_contracts_total: number;
    };
  };
}
