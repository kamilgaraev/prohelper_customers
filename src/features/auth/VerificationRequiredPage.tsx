import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { resolveApiMessage } from '@shared/api/apiHelpers';
import { authService } from '@shared/api/authService';
import { useAuth } from '@shared/contexts/AuthContext';

export function VerificationRequiredPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout, pendingVerification, status } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResend() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await authService.resendVerification(pendingVerification?.email);
      setMessage('Письмо с подтверждением отправлено повторно.');
    } catch (requestError) {
      setError(resolveApiMessage(requestError, 'Не удалось отправить письмо с подтверждением.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReturnToLogin() {
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  }

  if (isAuthenticated && status !== 'pending_verification') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout
      title="Подтвердите email"
      description="Подтвердите email, чтобы открыть рабочее пространство проекта."
      footer={
        <p>
          <button className="auth-text-button" type="button" onClick={handleReturnToLogin} disabled={isLoading}>
            Вернуться ко входу
          </button>
        </p>
      }
    >
      <div className="auth-form">
        <div className="form-success">
          Мы отправили письмо на <strong>{pendingVerification?.email ?? 'ваш email'}</strong>.
        </div>
        {message ? <div className="form-success">{message}</div> : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button type="button" className="primary-button" onClick={handleResend} disabled={isSubmitting}>
          {isSubmitting ? 'Отправляем...' : 'Отправить письмо повторно'}
        </button>
      </div>
    </AuthLayout>
  );
}
