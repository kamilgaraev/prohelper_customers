import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export const CONVERSATIONS_EMPTY_TEXT = 'По доступным проектам пока нет активных сообщений.';

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
        description="Здесь собраны сообщения и обсуждения по проектам, доступным вашей организации."
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
          <p className="empty-state">{CONVERSATIONS_EMPTY_TEXT}</p>
        )}
      </section>
    </div>
  );
}
