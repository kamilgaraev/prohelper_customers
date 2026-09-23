import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { authService } from '@shared/api/authService';
import { extractApiData, resolveApiMessage } from '@shared/api/apiHelpers';
import { clearPendingVerification } from '@shared/api/storage';
import { useAuth } from '@shared/contexts/AuthContext';
import { StateView } from '@shared/ui';

type VerificationStatus = 'pending' | 'success' | 'error';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { completeVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [message, setMessage] = useState('Подтверждаем email...');

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: number | undefined;

    async function verifyEmail() {
      setStatus('pending');
      setMessage('Подтверждаем email...');
      const id = searchParams.get('id');
      const hash = searchParams.get('hash');
      const expires = searchParams.get('expires');
      const signature = searchParams.get('signature');

      if (!id || !hash || !signature) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Ссылка подтверждения неполная или повреждена.');
        }
        return;
      }

      try {
        const response = await authService.verifyEmail({ id, hash, expires, signature });
        const payload = extractApiData(response.data);

        if (cancelled) return;
        setStatus(payload.verified ? 'success' : 'error');
        setMessage(response.data.message ?? (payload.verified ? 'Email подтвержден.' : 'Не удалось подтвердить email.'));

        if (payload.verified) {
          clearPendingVerification();
          completeVerification();
          redirectTimer = window.setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1200);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(resolveApiMessage(error, 'Не удалось подтвердить email.'));
        }
      }
    }

    void verifyEmail();
    return () => {
      cancelled = true;
      if (redirectTimer !== undefined) window.clearTimeout(redirectTimer);
    };
  }, [completeVerification, navigate, searchParams]);

  return (
    <AuthLayout
      title="Подтверждение email"
      description="Завершаем регистрацию и привязываем подтверждённый email к вашему профилю."
      footer={
        <p>
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      }
    >
      <div className="auth-form">
        {status === 'pending' ? <StateView state="loading" title={message} /> : null}
        {status === 'error' ? <StateView state="error" description={message} /> : null}
        {status === 'success' ? <div className="form-success" role="status">{message}</div> : null}
        {status === 'success' ? (
          <Link className="auth-link-button" to="/login">
            Перейти ко входу
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  );
}
