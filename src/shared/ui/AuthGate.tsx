import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@shared/contexts/AuthContext';
import { usePermissions } from '@shared/contexts/PermissionsContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccess, isLoaded } = usePermissions();

  if (isLoading || !isLoaded) {
    return <div className="screen-loader">Подготавливаем customer-портал...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccess({ interface: 'customer' })) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

