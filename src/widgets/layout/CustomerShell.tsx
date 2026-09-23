import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@shared/contexts/AuthContext';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { getAdminEntryUrl, hasAdminInterface } from '@shared/utils/interfaceAccess';
import { customerNavigation } from '@widgets/layout/navigation';

export function CustomerShell() {
  const { logout, user } = useAuth();
  const { canAccess } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.localStorage.getItem('customer-theme') === 'dark' ? 'dark' : 'light'
  );
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
  const roleLabel = user?.role ? (roleLabels[user.role] ?? 'Участник команды проекта') : 'Участник проекта';
  const canOpenAdmin = hasAdminInterface(user?.interfaces) && canAccess({ permission: 'admin.access' });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('customer-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) {
      if (menuWasOpen.current) menuButtonRef.current?.focus();
      menuWasOpen.current = false;
      return;
    }

    menuWasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    navigationRef.current?.querySelector<HTMLElement>('a')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key !== 'Tab') return;

      const items = navigationRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      if (!items?.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="customer-shell">
      {menuOpen ? <button className="sidebar-backdrop" type="button" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} /> : null}
      <aside id="customer-navigation" ref={navigationRef} className={`customer-sidebar${menuOpen ? ' customer-sidebar--open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-main">
            <img className="brand-logo" src={theme === 'dark' ? '/logo-white.svg' : '/logo.svg'} alt="" />
            <strong>МОСТ</strong>
          </div>
          <span className="brand-kicker">Кабинет участника</span>
          <span>{user?.companyName ?? 'Рабочее пространство проекта'}</span>
        </div>

        <button type="button" className="sidebar-toggle" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню">
          <X size={18} />
        </button>

        <nav className="sidebar-nav">
          {customerNavigation
            .filter((item) => item.to !== '/dashboard/rfi' || canAccess({ permission: 'change-management.view' }))
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `nav-entry${isActive ? ' nav-entry--active' : ''}`}
              onClick={() => setMenuOpen(false)}
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
          <button ref={menuButtonRef} className="mobile-menu-button" type="button" aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="customer-navigation" onClick={() => setMenuOpen(true)}>
            <Menu size={18} />
          </button>
          <div>
            <span className="topbar-kicker">Участник проекта</span>
            <h2>Рабочее пространство проекта</h2>
          </div>
          <div className="topbar-actions">
            <button className="theme-toggle" type="button" aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'} title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
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

        <main className="customer-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
