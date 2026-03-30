import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { useAuth } from '@shared/contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Не удалось выполнить вход');
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout
      title="Единый кабинет заказчика"
      description="Контролируйте статус объектов, документы, согласования и рабочие переписки в одном интерфейсе."
      footer={
        <p>
          Нет аккаунта? <Link to="/register">Создать customer-профиль</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="name@company.ru"
          />
        </label>
        <label>
          Пароль
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Введите пароль"
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Входим...' : 'Открыть кабинет'}
        </button>
      </form>
    </AuthLayout>
  );
}
