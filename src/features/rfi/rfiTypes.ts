export type RfiStatus =
  | 'draft'
  | 'sent'
  | 'answered'
  | 'clarification_requested'
  | 'accepted'
  | 'closed'
  | string;

export type RfiDirection = 'incoming' | 'outgoing' | 'drafts';
export type RfiAction = 'send' | 'answer' | 'accept' | 'request_clarification' | 'close' | 'upload_attachment' | string;

export interface RfiAttachment {
  id: string;
  name: string;
  mime_type: string | null;
  size: number | null;
}

export interface RfiHistoryEntry {
  id: number;
  event: string;
  actor_user_id?: number | null;
  actor_organization_id?: number | null;
  from_status?: RfiStatus | null;
  to_status?: RfiStatus | null;
  message?: string | null;
  attachments?: RfiAttachment[];
  created_at: string;
}

export interface ProjectRfi {
  id: number;
  project_id: number;
  initiator_organization_id: number;
  recipient_organization_id: number | null;
  author_organization_id?: number | null;
  status: RfiStatus;
  due_date?: string | null;
  response_due_date?: string | null;
  is_overdue?: boolean;
  subject: string;
  question: string;
  answer?: string | null;
  available_actions: RfiAction[];
  history: RfiHistoryEntry[];
  attachments?: RfiAttachment[];
  created_at: string;
  updated_at: string;
}

export interface RfiRecipient {
  organization_id: number;
  name: string;
  relation: 'parent' | 'child';
}

export interface RfiListResult {
  items: ProjectRfi[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export function rfiHasAction(availableActions: readonly RfiAction[] | null | undefined, action: RfiAction): boolean {
  return Array.isArray(availableActions) && availableActions.includes(action);
}
