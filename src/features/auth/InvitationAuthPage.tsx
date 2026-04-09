import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { resolveApiMessage } from '@shared/api/apiHelpers';
import { authService } from '@shared/api/authService';
import { useAuth } from '@shared/contexts/AuthContext';
import { InvitationResolution } from '@shared/types/auth';

type FormMode = 'login' | 'register';

export function InvitationAuthPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { status } = useAuth();
  const [invitation, setInvitation] = useState<InvitationResolution | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('login');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Ссылка приглашения неполная.');
      setIsLoading(false);
      return;
    }

    const invitationToken = token;
    let cancelled = false;

    async function loadInvitation() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authService.resolveInvitation(invitationToken);

        if (cancelled) {
          return;
        }

        setInvitation(result);
        setEmail(result.email ?? '');
        setCompanyName(result.organization?.name ?? '');
        setFormMode(result.nextAction === 'login' ? 'login' : 'register');
      } catch (requestError) {
        if (!cancelled) {
          setError(resolveApiMessage(requestError, 'Не удалось проверить приглашение.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (formMode === 'login') {
        const result = await authService.loginWithInvitation(token, { email, password });

        if ('token' in result) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/verification-required', { replace: true });
        }

        return;
      }

      await authService.registerWithInvitation(token, {
        name,
        companyName,
        email,
        password,
      });

      navigate('/verification-required', { replace: true });
    } catch (requestError) {
      setError(resolveApiMessage(requestError, 'Не удалось обработать приглашение.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!token) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeclining(true);

    try {
      await authService.declineInvitation(token);
      setSuccess('Приглашение отклонено. Если понадобится, вы сможете вернуться к обычному входу в кабинет.');
      setInvitation((current) =>
        current
          ? {
              ...current,
              status: 'declined',
              nextAction: 'unavailable',
            }
          : current
      );
    } catch (requestError) {
      setError(resolveApiMessage(requestError, 'Не удалось отклонить приглашение.'));
    } finally {
      setIsDeclining(false);
    }
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  const isInvitationUnavailable = invitation?.nextAction === 'unavailable';

  return (
    <AuthLayout
      title="Приглашение в кабинет"
      description={
        invitation
          ? `Проект: ${invitation.project?.name ?? 'без названия'}`
          : 'Проверяем приглашение и готовим безопасный вход.'
      }
      footer={
        <p>
          <Link to="/login">Перейти к обычному входу</Link>
        </p>
      }
    >
      {isLoading ? (
        <div className="auth-form">
          <div className="form-success">Проверяем приглашение...</div>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {invitation ? (
            <div className="form-success">
              <strong>{invitation.organization?.name ?? 'Организация не указана'}</strong>
              <br />
              Роль в проекте: {invitation.role}
              {invitation.project?.name ? ` • ${invitation.project.name}` : ''}
            </div>
          ) : null}

          {formMode === 'register' ? (
            <label>
              Контактное лицо
              <input value={name} onChange={(event) => setName(event.target.value)} type="text" />
            </label>
          ) : null}

          {formMode === 'register' ? (
            <label>
              Организация
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} type="text" />
            </label>
          ) : null}

          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>

          <label>
            Пароль
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>

          {invitation?.nextAction === 'login_or_register' ? (
            <div className="auth-grid">
              <button type="button" onClick={() => setFormMode('login')}>
                Войти
              </button>
              <button type="button" onClick={() => setFormMode('register')}>
                Зарегистрироваться
              </button>
            </div>
          ) : null}

          {success ? <div className="form-success">{success}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" disabled={isSubmitting || !invitation || isInvitationUnavailable}>
            {isSubmitting
              ? 'Сохраняем...'
              : formMode === 'login'
                ? 'Войти и принять приглашение'
                : 'Создать аккаунт по приглашению'}
          </button>

          {invitation && invitation.status === 'pending' ? (
            <button type="button" className="ghost-button" onClick={() => void handleDecline()} disabled={isDeclining}>
              {isDeclining ? 'Отклоняем...' : 'Отклонить приглашение'}
            </button>
          ) : null}
        </form>
      )}
    </AuthLayout>
  );
}
