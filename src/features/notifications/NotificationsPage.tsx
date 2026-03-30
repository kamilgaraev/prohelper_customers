import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function NotificationsPage() {
  const { value: notifications, error } = useAsyncValue(
    () => customerPortalService.getNotifications(),
    []
  );

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Notifications"
        title="Сигналы и события"
        description="Лента customer-уведомлений по текущей организации: новые документы, системные сигналы и изменения по рабочим процессам."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {notifications?.length ? (
          notifications.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.createdAtLabel ?? 'Дата уточняется'}</p>
                <StatusPill tone={item.tone}>{item.statusLabel}</StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Уведомлений пока нет. Как только backend публикует события для customer-контура, они появятся здесь.</p>
        )}
      </section>
    </div>
  );
}
