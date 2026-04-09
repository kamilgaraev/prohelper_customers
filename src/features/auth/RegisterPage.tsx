import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { useAuth } from '@shared/contexts/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, status } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await register({ name, companyName, email, password });
      navigate('/verification-required', { replace: true });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Не удалось создать кабинет заказчика.');
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (status === 'pending_verification') {
    return <Navigate to="/verification-required" replace />;
  }

  return (
    <AuthLayout
      title="Регистрация кабинета заказчика"
      description="Создайте защищенный кабинет и подключите рабочее пространство для проектов, документов и согласований."
      footer={
        <p>
          Уже есть доступ? <Link to="/login">Войти в кабинет</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Контактное лицо
          <input value={name} onChange={(event) => setName(event.target.value)} type="text" />
        </label>
        <label>
          Организация
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            type="text"
          />
        </label>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Пароль
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Создаем...' : 'Создать кабинет'}
        </button>
      </form>
    </AuthLayout>
  );
}
