import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';

export function TeamPage() {
  const { value, error } = useAsyncValue(() => customerPortalService.getTeam(), []);
  const roleMap = new Map((value?.available_roles ?? []).map((role) => [role.slug, role.name]));

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Team"
        title="Команда заказчика"
        description="Состав участников организации и доступные роли в кабинете заказчика."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Участники</h3>
            <span>{value?.members.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {value?.members.length ? (
              value.members.map((member) => (
                <div key={member.id} className="list-row">
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.email}</p>
                    <p>{member.roles.map((role) => roleMap.get(role) ?? role).join(' • ') || 'Роль не назначена'}</p>
                  </div>
                  <span>{member.is_owner ? 'Владелец' : 'Участник'}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">В составе команды пока нет участников.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Каталог ролей</h3>
          </div>
          <div className="list-stack">
            {value?.available_roles.length ? (
              value.available_roles.map((role) => (
                <div key={role.slug} className="list-row">
                  <div>
                    <strong>{role.name}</strong>
                    <p>{role.description ?? 'Описание уточняется'}</p>
                  </div>
                  <span>{role.permissions.length} прав</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Каталог ролей пока не доступен.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
