import { ReactNode } from 'react';

import { AuthProvider } from '@shared/contexts/AuthContext';
import { PermissionsProvider } from '@shared/contexts/PermissionsContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </AuthProvider>
  );
}

