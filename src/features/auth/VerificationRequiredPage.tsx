import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { resolveApiMessage } from '@shared/api/apiHelpers';
import { authService } from '@shared/api/authService';
import { useAuth } from '@shared/contexts/AuthContext';

export function VerificationRequiredPage() {
  const { isAuthenticated, pendingVerification, status } = useAuth();
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

  if (isAuthenticated && status !== 'pending_verification') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout
      title="Подтвердите email"
      description="Без подтверждения email кабинет заказчика останется закрытым."
      footer={
        <p>
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      }
    >
      <div className="auth-form">
        <div className="form-success">
          Мы отправили письмо на <strong>{pendingVerification?.email ?? 'ваш email'}</strong>.
        </div>
        {message ? <div className="form-success">{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        <button type="button" onClick={handleResend} disabled={isSubmitting}>
          {isSubmitting ? 'Отправляем...' : 'Отправить письмо повторно'}
        </button>
      </div>
    </AuthLayout>
  );
}
