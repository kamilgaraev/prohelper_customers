export type CustomerRole =
  | 'customer_owner'
  | 'customer_manager'
  | 'customer_approver'
  | 'customer_viewer'
  | 'customer_curator'
  | 'customer_financier'
  | 'customer_legal'
  | 'customer_observer';

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  accountType: 'organization' | 'individual';
  companyName: string;
  role: CustomerRole;
  roles: CustomerRole[];
  interfaces: string[];
  phone?: string | null;
  organizationId?: number | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  companyName: string;
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: CustomerUser;
}
