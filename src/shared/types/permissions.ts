export interface PermissionsData {
  permissionsFlat: string[];
  roles: string[];
  interfaces: string[];
}

export interface AccessOptions {
  permission?: string;
  role?: string;
  interface?: 'customer' | 'lk' | 'admin' | 'mobile';
  requireAll?: boolean;
}

