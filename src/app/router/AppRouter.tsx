import { Navigate, Route, Routes } from 'react-router-dom';

import { ForgotPasswordPage } from '@features/auth/ForgotPasswordPage';
import { InvitationAuthPage } from '@features/auth/InvitationAuthPage';
import { LoginPage } from '@features/auth/LoginPage';
import { RegisterPage } from '@features/auth/RegisterPage';
import { ResetPasswordPage } from '@features/auth/ResetPasswordPage';
import { VerificationRequiredPage } from '@features/auth/VerificationRequiredPage';
import { VerifyEmailPage } from '@features/auth/VerifyEmailPage';
import { ApprovalsPage } from '@features/approvals/ApprovalsPage';
import { ContractDetailsPage } from '@features/contracts/ContractDetailsPage';
import { ContractsPage } from '@features/contracts/ContractsPage';
import { ConversationsPage } from '@features/conversations/ConversationsPage';
import { DashboardPage } from '@features/dashboard/DashboardPage';
import { DocumentsPage } from '@features/documents/DocumentsPage';
import { FinancePage } from '@features/finance/FinancePage';
import { HandoverPage } from '@features/handover/HandoverPage';
import { IssuesPage } from '@features/issues/IssuesPage';
import { NotificationsPage } from '@features/notifications/NotificationsPage';
import { CreateProjectPage } from '@features/projects/CreateProjectPage';
import { ProjectDetailsPage } from '@features/projects/ProjectDetailsPage';
import { ProjectsPage } from '@features/projects/ProjectsPage';
import { QualityDefectsPage } from '@features/quality/QualityDefectsPage';
import { RequestsPage } from '@features/requests/RequestsPage';
import { RisksPage } from '@features/risks/RisksPage';
import { ProfilePage } from '@features/profile/ProfilePage';
import { SupportPage } from '@features/support/SupportPage';
import { TeamPage } from '@features/team/TeamPage';
import { AuthGate } from '@shared/ui/AuthGate';
import { CustomerShell } from '@widgets/layout/CustomerShell';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verification-required" element={<VerificationRequiredPage />} />
      <Route path="/invitations/:token" element={<InvitationAuthPage />} />
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
        <Route path="quality-defects" element={<QualityDefectsPage />} />
        <Route path="handover" element={<HandoverPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<CreateProjectPage />} />
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
