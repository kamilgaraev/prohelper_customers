import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from '@features/auth/LoginPage';
import { RegisterPage } from '@features/auth/RegisterPage';
import { VerifyEmailPage } from '@features/auth/VerifyEmailPage';
import { ContractDetailsPage } from '@features/contracts/ContractDetailsPage';
import { ContractsPage } from '@features/contracts/ContractsPage';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { FinancePage } from '@features/finance/FinancePage';
import { IssuesPage } from '@features/issues/IssuesPage';
import { ProjectsPage } from '@features/projects/ProjectsPage';
import { ProjectDetailsPage } from '@features/projects/ProjectDetailsPage';
import { RisksPage } from '@features/risks/RisksPage';
import { RequestsPage } from '@features/requests/RequestsPage';
import { DocumentsPage } from '@features/documents/DocumentsPage';
import { ApprovalsPage } from '@features/approvals/ApprovalsPage';
import { ConversationsPage } from '@features/conversations/ConversationsPage';
import { NotificationsPage } from '@features/notifications/NotificationsPage';
import { SupportPage } from '@features/support/SupportPage';
import { TeamPage } from '@features/team/TeamPage';
import { ProfilePage } from '@features/profile/ProfilePage';
import { CustomerShell } from '@widgets/layout/CustomerShell';
import { AuthGate } from '@shared/ui/AuthGate';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/dashboard"
        element={
          <AuthGate>
            <CustomerShell />
          </AuthGate>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="contracts/:contractId" element={<ContractDetailsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="risks" element={<RisksPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
