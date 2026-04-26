import { useState } from 'react';
import { ArrowUpRight, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@shared/contexts/AuthContext';
import { getAdminEntryUrl, hasAdminInterface } from '@shared/utils/interfaceAccess';
import { customerNavigation } from '@widgets/layout/navigation';

export function CustomerShell() {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const roleLabels: Record<string, string> = {
    customer_owner: 'Руководитель',
    customer_manager: 'Менеджер',
    customer_approver: 'Согласующий',
    customer_viewer: 'Наблюдатель',
    customer_curator: 'Куратор проекта',
    customer_financier: 'Финансист',
    customer_legal: 'Юрист',
    customer_observer: 'Наблюдатель',
  };
  const roleLabel = user?.role ? (roleLabels[user.role] ?? 'Участник команды заказчика') : 'Кабинет заказчика';
  const canOpenAdmin = hasAdminInterface(user?.interfaces);

  return (
    <div className="customer-shell">
      <aside className={`customer-sidebar${collapsed ? ' customer-sidebar--collapsed' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-main">
            <img className="brand-logo" src="/logo-white.svg" alt="" />
            <strong>ProHelper</strong>
          </div>
          <span className="brand-kicker">Customer portal</span>
          <span>{user?.companyName ?? 'Кабинет заказчика'}</span>
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-label="Переключить навигацию"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <nav className="sidebar-nav">
          {customerNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `nav-entry${isActive ? ' nav-entry--active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={logout}>
          <LogOut size={18} />
          <span>Выйти</span>
        </button>
      </aside>

      <div className="customer-content">
        <header className="customer-topbar">
          <div>
            <span className="topbar-kicker">Заказчик</span>
            <h2>Рабочее пространство проекта</h2>
          </div>
          <div className="topbar-actions">
            {canOpenAdmin ? (
              <a className="admin-entry-button" href={getAdminEntryUrl()}>
                <span>Перейти в админку</span>
                <ArrowUpRight size={16} />
              </a>
            ) : null}
            <div className="topbar-profile">
              <span>{user?.name}</span>
              <small>{roleLabel}</small>
            </div>
          </div>
        </header>

        <motion.main
          key="customer-main"
          className="customer-main"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
