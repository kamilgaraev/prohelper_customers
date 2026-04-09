import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { authService } from '@shared/api/authService';
import { resolveApiMessage } from '@shared/api/apiHelpers';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') ?? '', [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authService.resetPassword({ email, token, password });
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(resolveApiMessage(requestError, 'Не удалось изменить пароль.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Новый пароль"
      description="Задайте новый пароль для кабинета заказчика."
      footer={
        <p>
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} type="email" disabled />
        </label>
        <label>
          Новый пароль
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={isSubmitting || !token || !email}>
          {isSubmitting ? 'Сохраняем...' : 'Сохранить пароль'}
        </button>
      </form>
    </AuthLayout>
  );
}
