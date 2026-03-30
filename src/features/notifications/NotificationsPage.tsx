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
        description="Непрочитанные сообщения, новые документы и обновления по согласованиям в одном feed."
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
                <p className="conversation-preview">{item.createdAtLabel}</p>
                <StatusPill tone={item.tone}>{item.tone}</StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Уведомлений пока нет. Как только backend начнет их публиковать, список появится здесь.</p>
        )}
      </section>
    </div>
  );
}
