import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@shared/contexts/AuthContext';
import { AccessOptions, PermissionsData } from '@shared/types/permissions';

interface PermissionsContextValue {
  permissions: PermissionsData;
  isLoaded: boolean;
  canAccess: (options: AccessOptions) => boolean;
}

const staticCustomerPermissions: string[] = [
  'customer.dashboard.view',
  'customer.projects.view',
  'customer.documents.view',
  'customer.approvals.manage',
  'customer.conversations.view',
  'customer.notifications.view',
  'customer.support.manage',
  'customer.profile.edit'
];

const emptyPermissions: PermissionsData = {
  permissionsFlat: [],
  roles: [],
  interfaces: []
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsData>(emptyPermissions);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setPermissions(emptyPermissions);
      setIsLoaded(true);
      return;
    }

    setPermissions({
      permissionsFlat: staticCustomerPermissions,
      roles: user.roles?.length ? user.roles : [user.role],
      interfaces: user.interfaces
    });
    setIsLoaded(true);
  }, [user]);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      isLoaded,
      canAccess: ({ permission, role, interface: interfaceName, requireAll = true }: AccessOptions) => {
        const checks: boolean[] = [];

        if (permission) {
          checks.push(permissions.permissionsFlat.includes(permission));
        }

        if (role) {
          checks.push(permissions.roles.includes(role));
        }

        if (interfaceName) {
          checks.push(permissions.interfaces.includes(interfaceName));
        }

        if (checks.length === 0) {
          return true;
        }

        return requireAll ? checks.every(Boolean) : checks.some(Boolean);
      }
    }),
    [isLoaded, permissions]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }

  return context;
}
