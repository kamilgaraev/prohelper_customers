import { useAuth } from '@shared/contexts/AuthContext';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Profile"
        title="Профиль customer-аккаунта"
        description="Состав аккаунта, роль текущего пользователя и готовность к подключению backend customer-role модели."
      />

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Текущий пользователь</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Имя</span>
              <strong>{user?.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div>
              <span>Компания</span>
              <strong>{user?.companyName}</strong>
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
              <strong>{user?.accountType}</strong>
            </div>
            <div>
              <span>Роль</span>
              <strong>{user?.role}</strong>
            </div>
            <div>
              <span>Interface</span>
              <StatusPill tone="success">customer</StatusPill>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

