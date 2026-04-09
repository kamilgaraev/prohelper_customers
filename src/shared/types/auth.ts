export type CustomerRole =
  | 'customer_owner'
  | 'customer_manager'
  | 'customer_approver'
  | 'customer_viewer'
  | 'customer_curator'
  | 'customer_financier'
  | 'customer_legal'
  | 'customer_observer';

export type AuthSessionStatus = 'guest' | 'authenticated' | 'pending_verification';

export type OnboardingStatus = 'verification_required';

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

export interface PendingVerificationUser {
  name: string;
  email: string;
  companyName: string;
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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: CustomerUser;
  emailVerified: boolean;
  availableInterfaces: string[];
}

export interface PendingVerificationState {
  status: OnboardingStatus;
  email: string;
  canEnterPortal: boolean;
  user?: PendingVerificationUser;
}

export interface OnboardingResult {
  status: OnboardingStatus;
  email: string;
  canEnterPortal: boolean;
  user?: PendingVerificationUser;
  organization?: {
    id: number;
    name: string;
  };
}

export interface InvitationResolution {
  token: string;
  status: string;
  role: string;
  email?: string | null;
  organization?: {
    id?: number | null;
    name?: string | null;
    inn?: string | null;
  };
  project?: {
    id?: number | null;
    name?: string | null;
  };
  nextAction: 'login' | 'login_or_register' | 'unavailable';
  expiresAt?: string | null;
}
