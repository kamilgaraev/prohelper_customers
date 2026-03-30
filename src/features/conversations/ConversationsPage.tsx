import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ConversationsPage() {
  const { value: conversations, error } = useAsyncValue(
    () => customerPortalService.getConversations(),
    []
  );

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Conversations"
        title="Проектные коммуникации"
        description="Экран уже подключен к реальному customer endpoint. Как только в backend появится отдельная customer/project-модель переписки, лента начнет заполняться без дополнительных изменений в UI."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {conversations?.length ? (
          conversations.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.projectName}</p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.lastMessage}</p>
                <StatusPill tone={item.unreadCount > 0 ? 'warning' : 'neutral'}>
                  {item.unreadCount > 0 ? `${item.unreadCount} новых` : 'Без новых'}
                </StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Отдельная customer-переписка по проектам пока не опубликована backend-модулем.</p>
        )}
      </section>
    </div>
  );
}
