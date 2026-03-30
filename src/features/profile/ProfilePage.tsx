import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ProfilePage() {
  const { value: user, error } = useAsyncValue(() => customerPortalService.getProfile(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Profile"
        title="Профиль customer-аккаунта"
        description="Состав аккаунта, роли текущего пользователя и интерфейсы, которые доступны в customer-контуре."
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
            <h3>Access model</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Тип аккаунта</span>
              <strong>{user?.accountType ?? 'organization'}</strong>
            </div>
            <div>
              <span>Главная роль</span>
              <strong>{user?.role ?? 'customer_viewer'}</strong>
            </div>
            <div>
              <span>Роли</span>
              <strong>{user?.roles?.join(', ') ?? '—'}</strong>
            </div>
            <div>
              <span>Interfaces</span>
              <StatusPill tone="success">{user?.interfaces?.join(', ') ?? 'customer'}</StatusPill>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
