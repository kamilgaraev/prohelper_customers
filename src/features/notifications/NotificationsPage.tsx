import { useEffect, useState } from 'react';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { NotificationSettings } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function NotificationsPage() {
  const { canAccess } = usePermissions();
  const canManageSettings = canAccess({ permission: 'customer.notification_settings.manage' });
  const { value: notifications, error } = useAsyncValue(() => customerPortalService.getNotifications(), []);
  const { value: settings } = useAsyncValue(() => customerPortalService.getNotificationSettings(), []);
  const [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

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

  const eventLabels: Record<keyof NotificationSettings['events'], string> = {
    new_contract: 'Новый договор',
    new_approval: 'Новый акт на согласование',
    issue_waiting_response: 'Замечание ждет ответа',
    request_deadline: 'Подходит срок ответа по запросу',
    contract_amount_changed: 'Изменилась сумма договора',
    new_document: 'Появился новый документ',
    request_status_changed: 'Изменился статус запроса',
  };
  const notificationEventLabels: Record<string, string> = {
    new_contract: 'Новый договор',
    new_approval: 'Новый акт на согласование',
    issue_waiting_response: 'Замечание ждет ответа',
    request_deadline: 'Подходит срок ответа по запросу',
    contract_amount_changed: 'Изменилась сумма договора',
    new_document: 'Появился новый документ',
    request_status_changed: 'Изменился статус запроса',
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Notifications"
        title="Сигналы и уведомления"
        description="Лента событий по проектам и персональные настройки того, о чем кабинет должен предупреждать пользователя."
      />

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
        {notifications?.length ? (
          notifications.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <p>{item.eventType ? (notificationEventLabels[item.eventType] ?? 'Событие по проекту') : 'Событие по проекту'}</p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.createdAtLabel ?? 'Дата уточняется'}</p>
                <StatusPill tone={item.tone}>{item.statusLabel}</StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Уведомлений пока нет.</p>
        )}
      </section>
    </div>
  );
}
