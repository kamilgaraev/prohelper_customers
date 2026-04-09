import { useEffect, useMemo, useState } from 'react';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { CustomerTeamMember } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function TeamPage() {
  const { value, error } = useAsyncValue(() => customerPortalService.getTeam(), []);
  const [selectedMember, setSelectedMember] = useState<CustomerTeamMember | null>(null);
  const roleMap = useMemo(
    () => new Map((value?.available_roles ?? []).map((role) => [role.slug, role.name])),
    [value?.available_roles]
  );
  const { value: memberDetails } = useAsyncValue(
    () => (selectedMember ? customerPortalService.getTeamMember(selectedMember.id) : Promise.resolve(null)),
    [selectedMember?.id]
  );

  useEffect(() => {
    if (!selectedMember && value?.members.length) {
      setSelectedMember(value.members[0]);
    }
  }, [selectedMember, value?.members]);

  const detail = memberDetails ?? selectedMember;

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Team"
        title="Команда заказчика"
        description="Состав участников организации, роли, проектный доступ и история последних изменений по доступам."
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
                <button key={member.id} type="button" className="list-row" onClick={() => setSelectedMember(member)}>
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.email}</p>
                    <p>{member.roles.map((role) => roleMap.get(role) ?? role).join(' • ') || 'Роль не назначена'}</p>
                  </div>
                  <StatusPill tone={member.status === 'active' ? 'success' : 'warning'}>
                    {member.status === 'active' ? 'Активен' : 'Неактивен'}
                  </StatusPill>
                </button>
              ))
            ) : (
              <p className="empty-state">В составе команды пока нет участников.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Карточка участника</h3>
          </div>
          {detail ? (
            <div className="profile-list">
              <div>
                <span>Имя</span>
                <strong>{detail.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{detail.email}</strong>
              </div>
              <div>
                <span>Телефон</span>
                <strong>{detail.phone ?? 'Не указан'}</strong>
              </div>
              <div>
                <span>Роли</span>
                <strong>{detail.roles.map((role) => roleMap.get(role) ?? role).join(' • ') || 'Не назначены'}</strong>
              </div>
              <div>
                <span>Проектный доступ</span>
                <strong>
                  {detail.has_full_project_access
                    ? 'Все доступные проекты'
                    : detail.project_access.map((project) => project.name).join(' • ') || 'Не назначен'}
                </strong>
              </div>
              <div>
                <span>Статус</span>
                <strong>{detail.status === 'active' ? 'Активен' : 'Неактивен'}</strong>
              </div>
              <div>
                <span>Роль владельца</span>
                <strong>{detail.is_owner ? 'Да' : 'Нет'}</strong>
              </div>
              <div>
                <span>Доступных проектов</span>
                <strong>{detail.available_project_count}</strong>
              </div>
            </div>
          ) : (
            <p className="empty-state">Выберите участника, чтобы посмотреть доступы и историю изменений.</p>
          )}
        </article>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Проекты участника</h3>
          </div>
          <div className="list-stack">
            {detail ? (
              detail.has_full_project_access ? (
                <p className="empty-state">Участнику открыт доступ ко всем доступным проектам организации.</p>
              ) : detail.project_access.length ? (
                detail.project_access.map((project) => (
                  <div key={project.id} className="list-row">
                    <div>
                      <strong>{project.name}</strong>
                      <p>ID проекта: {project.id}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">Проекты пока не назначены.</p>
              )
            ) : (
              <p className="empty-state">Выберите участника слева.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>История изменений доступа</h3>
          </div>
          <div className="list-stack">
            {detail?.access_history.length ? (
              detail.access_history.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.action}</strong>
                    <p>{item.role ? roleMap.get(item.role) ?? item.role : 'Без роли'}</p>
                  </div>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : 'Без даты'}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">История изменений доступа пока пустая.</p>
            )}
          </div>
        </article>
      </section>

      <section className="plain-panel">
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
            <p className="empty-state">Каталог ролей пока недоступен.</p>
          )}
        </div>
      </section>
    </div>
  );
}
