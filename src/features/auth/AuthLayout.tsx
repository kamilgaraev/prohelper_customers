import { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-poster">
        <div className="auth-brand">
          <img className="auth-logo" src="/logo-white.svg" alt="" />
          <strong>ProHelper</strong>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="auth-grid">
          <span>Проекты</span>
          <span>Документы</span>
          <span>Согласования</span>
          <span>События</span>
        </div>
      </div>
      <div className="auth-panel">
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </div>
  );
}
