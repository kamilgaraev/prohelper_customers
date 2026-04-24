import { ArrowUpRight } from 'lucide-react';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { getAdminEntryUrl, hasAdminInterface } from '@shared/utils/interfaceAccess';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

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

export function ProfilePage() {
  const { value: user, error } = useAsyncValue(() => customerPortalService.getProfile(), []);
  const canOpenAdmin = hasAdminInterface(user?.interfaces);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Profile"
        title="Профиль пользователя"
        description="Данные аккаунта, роли текущего пользователя и доступные рабочие разделы."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Текущий пользователь</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Имя</span>
              <strong>{user?.name ?? '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email ?? '—'}</strong>
            </div>
            <div>
              <span>Телефон</span>
              <strong>{user?.phone ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Компания</span>
              <strong>{user?.companyName ?? '—'}</strong>
            </div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Доступ</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Тип аккаунта</span>
              <strong>{user?.accountType ?? 'organization'}</strong>
            </div>
            <div>
              <span>Главная роль</span>
              <strong>{user?.role ? (roleLabels[user.role] ?? user.role) : 'Наблюдатель'}</strong>
            </div>
            <div>
              <span>Роли</span>
              <strong>{user?.roles?.map((role) => roleLabels[role] ?? role).join(', ') ?? '—'}</strong>
            </div>
            <div>
              <span>Разделы</span>
              <StatusPill tone="success">{user?.interfaces?.join(', ') ?? 'customer'}</StatusPill>
            </div>
          </div>

          {canOpenAdmin ? (
            <a className="profile-admin-entry" href={getAdminEntryUrl()}>
              <span>Открыть админку</span>
              <ArrowUpRight size={16} />
            </a>
          ) : null}
        </article>
      </section>
    </div>
  );
}
