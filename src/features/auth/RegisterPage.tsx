import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@features/auth/AuthLayout';
import { useAuth } from '@shared/contexts/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await register({ name, companyName, email, password });
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout
      title="Запуск customer-контура"
      description="Создайте отдельный кабинет заказчика и сразу подготовьте рабочую среду под проекты, документы и коммуникации."
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
          Компания
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Создаём...' : 'Создать кабинет'}
        </button>
      </form>
    </AuthLayout>
  );
}

