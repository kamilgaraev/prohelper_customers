export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  accountType: 'organization' | 'individual';
  companyName: string;
  role: 'customer_owner' | 'customer_manager' | 'customer_approver' | 'customer_viewer';
  interfaces: string[];
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

