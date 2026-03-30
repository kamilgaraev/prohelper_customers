import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '@features/auth/LoginPage';
import { RegisterPage } from '@features/auth/RegisterPage';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { ProjectsPage } from '@features/projects/ProjectsPage';
import { ProjectDetailsPage } from '@features/projects/ProjectDetailsPage';
import { DocumentsPage } from '@features/documents/DocumentsPage';
import { ApprovalsPage } from '@features/approvals/ApprovalsPage';
import { ConversationsPage } from '@features/conversations/ConversationsPage';
import { NotificationsPage } from '@features/notifications/NotificationsPage';
import { SupportPage } from '@features/support/SupportPage';
import { ProfilePage } from '@features/profile/ProfilePage';
import { CustomerShell } from '@widgets/layout/CustomerShell';
import { AuthGate } from '@shared/ui/AuthGate';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <AuthGate>
            <CustomerShell />
          </AuthGate>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
