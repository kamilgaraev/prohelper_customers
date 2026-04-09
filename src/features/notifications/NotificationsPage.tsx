import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { NotificationSettings } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function resolveEntityLink(type?: string | null, id?: number | null): string | null {
  if (!type || !id) {
    return null;
  }

  switch (type) {
    case 'contract':
      return `/dashboard/contracts/${id}`;
    case 'issue':
      return `/dashboard/issues?selected=${id}`;
    case 'request':
      return `/dashboard/requests?selected=${id}`;
    default:
      return null;
  }
}

export function NotificationsPage() {
  const { canAccess } = usePermissions();
  const canManageSettings = canAccess({ permission: 'customer.notification_settings.manage' });
  const [searchParams, setSearchParams] = useSearchParams();
  const unreadOnly = searchParams.get('unread') === 'true';
  const eventType = searchParams.get('event_type') || '';
  const { value: notificationsResponse, error } = useAsyncValue(
    () => customerPortalService.getNotifications({ unread: unreadOnly || undefined, event_type: eventType || undefined }),
    [searchParams.toString()]
  );
  const { value: settings } = useAsyncValue(() => customerPortalService.getNotificationSettings(), []);
  const [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

  const eventLabels: Record<keyof NotificationSettings['events'], string> = {
    new_contract: 'Новый договор',
    new_approval: 'Новый акт на согласование',
    issue_waiting_response: 'Замечание ждет ответа',
    request_deadline: 'Подходит срок ответа по запросу',
    contract_amount_changed: 'Изменилась сумма договора',
    new_document: 'Появился новый документ',
    request_status_changed: 'Изменился статус запроса',
    project_deadline_changed: 'Изменился срок проекта',
    access_updated: 'Изменен доступ пользователя',
    finance_risk_detected: 'Появился финансовый риск',
  };

  const availableEventTypes = useMemo(() => Object.keys(eventLabels), []);

  const handleToggle = async (key: keyof NotificationSettings['events']) => {
    if (!draft) {
      return;
    }

    const next = {
      ...draft,
      events: {
        ...draft.events,
        [key]: !draft.events[key],
      },
    };

    setDraft(next);

    if (!canManageSettings) {
      return;
    }

    setSaving(true);

    try {
      const saved = await customerPortalService.updateNotificationSettings(next);
      setDraft(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Notifications"
        title="События и уведомления"
        description="Центр сигналов по проектам: важные изменения, риски, новые документы, запросы и персональные настройки каналов."
      />

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры ленты</h3>
          <span>{notificationsResponse?.meta.total ?? 0}</span>
        </div>
        <div className="profile-list">
          <label>
            <span>Показывать только непрочитанные</span>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.checked) {
                  next.set('unread', 'true');
                } else {
                  next.delete('unread');
                }
                setSearchParams(next);
              }}
            />
          </label>
          <label>
            <span>Тип события</span>
            <select
              value={eventType}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) {
                  next.set('event_type', event.target.value);
                } else {
                  next.delete('event_type');
                }
                setSearchParams(next);
              }}
            >
              <option value="">Все события</option>
              {availableEventTypes.map((key) => (
                <option key={key} value={key}>
                  {eventLabels[key as keyof NotificationSettings['events']]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span>Непрочитанные</span>
            <strong>{notificationsResponse?.meta.unread_count ?? '—'}</strong>
          </div>
        </div>
      </section>

      {draft ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>Настройки уведомлений</h3>
            <span>{saving ? 'Сохраняем...' : 'Актуально'}</span>
          </div>
          <div className="profile-list">
            {Object.entries(draft.events).map(([key, value]) => (
              <label key={key}>
                <span>{eventLabels[key as keyof NotificationSettings['events']]}</span>
                <input
                  type="checkbox"
                  checked={value}
                  disabled={!canManageSettings}
                  onChange={() => void handleToggle(key as keyof NotificationSettings['events'])}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {notificationsResponse?.items.length ? (
          notificationsResponse.items.map((item) => {
            const entityLink = resolveEntityLink(item.related_entity?.type, item.related_entity?.id);

            return (
              <article key={item.id} className="list-row list-row--surface">
                <div>
                  <strong>{entityLink ? <Link to={entityLink}>{item.title}</Link> : item.title}</strong>
                  <p>{item.description}</p>
                  <p>
                    {item.project ? `Проект: ${item.project.name}` : 'Событие по кабинету'}
                    {item.eventType ? ` • ${eventLabels[item.eventType as keyof NotificationSettings['events']] ?? item.eventType}` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <p className="conversation-preview">{item.createdAtLabel ?? 'Дата уточняется'}</p>
                  <StatusPill tone={item.tone}>{item.statusLabel}</StatusPill>
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty-state">Уведомлений по выбранным условиям пока нет.</p>
        )}
      </section>
    </div>
  );
}
