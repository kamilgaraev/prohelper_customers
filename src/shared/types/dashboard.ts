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

