import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { authService } from '@shared/api/authService';
import { resolveApiMessage } from '@shared/api/apiHelpers';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword({ email });
      setMessage('Если такой email есть в системе, письмо для смены пароля уже отправлено.');
    } catch (requestError) {
      setError(resolveApiMessage(requestError, 'Не удалось отправить письмо для смены пароля.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Восстановление доступа"
      description="Отправим письмо со ссылкой для смены пароля в кабинете заказчика."
      footer={
        <p>
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        {message ? <div className="form-success">{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Отправляем...' : 'Отправить ссылку'}
        </button>
      </form>
    </AuthLayout>
  );
}
