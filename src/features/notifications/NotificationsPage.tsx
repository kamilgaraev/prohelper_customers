import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { NotificationSettings } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { StateView } from '@shared/ui';

function resolveEntityLink(type?: string | null, id?: number | null, projectId?: number | null): string | null {
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
    case 'rfi':
      return projectId ? `/dashboard/rfi?project_id=${projectId}&id=${id}` : `/dashboard/rfi?id=${id}`;
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
  const { value: notificationsResponse, error, isLoading } = useAsyncValue(
    () => customerPortalService.getNotifications({ unread: unreadOnly || undefined, event_type: eventType || undefined }),
    [searchParams.toString()]
  );
  const queryKey = searchParams.toString();
  const [settledQueryKey, setSettledQueryKey] = useState(queryKey);
  useEffect(() => {
    if (!isLoading && (error || notificationsResponse !== null)) setSettledQueryKey(queryKey);
  }, [error, isLoading, notificationsResponse, queryKey]);
  const contextLoading = isLoading || settledQueryKey !== queryKey;
  const { value: settings, error: settingsError, isLoading: settingsLoading } = useAsyncValue(() => customerPortalService.getNotificationSettings(), []);
  const [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsActionError, setSettingsActionError] = useState<string | null>(null);

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
  const rfiEventLabels = {
    'change_management.rfi.sent': 'Отправлен вопрос по проекту',
    'change_management.rfi.answered': 'Получен ответ по вопросу проекта',
    'change_management.rfi.clarification_requested': 'Запрошено уточнение по вопросу проекта',
    'change_management.rfi.accepted': 'Ответ по вопросу проекта принят',
    'change_management.rfi.closed': 'Вопрос по проекту закрыт',
    'change_management.rfi.reassigned': 'Изменён адресат вопроса по проекту',
  } satisfies Record<string, string>;
  const allEventLabels: Record<string, string> = { ...eventLabels, ...rfiEventLabels };

  const availableEventTypes = useMemo(() => Object.keys(allEventLabels), []);

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

    const previous = draft;
    setDraft(next);
    setSettingsActionError(null);

    if (!canManageSettings) {
      return;
    }

    setSaving(true);

    try {
      const saved = await customerPortalService.updateNotificationSettings(next);
      setDraft(saved);
    } catch (saveError) {
      setDraft(previous);
      setSettingsActionError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить настройки.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Уведомления"
        title="События и уведомления"
        description="Центр сигналов по проектам: важные изменения, риски, новые документы, запросы и персональные настройки каналов."
      />

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры ленты</h3>
          <span>{contextLoading || error ? '—' : notificationsResponse?.meta.total ?? 0}</span>
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
                  {allEventLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span>Непрочитанные</span>
            <strong>{contextLoading || error ? '—' : notificationsResponse?.meta.unread_count ?? '—'}</strong>
          </div>
        </div>
      </section>

        {settingsLoading ? <StateView state="loading" title="Загружаем настройки уведомлений" /> : null}
        {!settingsLoading && settingsError ? <StateView state="error" description={settingsError} /> : null}
        {settingsActionError ? <StateView state="error" description={settingsActionError} /> : null}
        {!settingsLoading && !settingsError && draft ? (
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
                  disabled={!canManageSettings || saving}
                  onChange={() => void handleToggle(key as keyof NotificationSettings['events'])}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="list-surface">
        {contextLoading ? <StateView state="loading" title="Загружаем уведомления" /> : null}
        {!contextLoading && error ? <StateView state="error" description={error} /> : null}
        {!contextLoading && !error && notificationsResponse?.items.length ? (
          notificationsResponse.items.map((item) => {
            const entityLink = resolveEntityLink(item.related_entity?.type, item.related_entity?.id, item.project?.id);

            return (
              <article key={item.id} className="list-row list-row--surface">
                <div>
                  <strong>{entityLink ? <Link to={entityLink}>{item.title}</Link> : item.title}</strong>
                  <p>{item.description}</p>
                  <p>
                    {item.project ? `Проект: ${item.project.name}` : 'Событие по кабинету'}
                    {item.eventType ? ` • ${allEventLabels[item.eventType] ?? item.eventType}` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <p className="conversation-preview">{item.createdAtLabel ?? 'Дата уточняется'}</p>
                  <StatusPill tone={item.tone}>{item.statusLabel}</StatusPill>
                </div>
              </article>
            );
          })
        ) : null}
        {!contextLoading && !error && !notificationsResponse?.items.length ? (
          <StateView state="empty" title="Уведомлений нет" description="По выбранным условиям события не найдены." />
        ) : null}
      </section>
    </div>
  );
}
