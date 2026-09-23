import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { StateView } from '@shared/ui';

export const CONVERSATIONS_EMPTY_TEXT = 'По доступным проектам пока нет активных сообщений.';

export function ConversationsPage() {
  const { value: conversations, error, isLoading } = useAsyncValue(
    () => customerPortalService.getConversations(),
    []
  );

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Сообщения"
        title="Проектные коммуникации"
        description="Здесь собраны сообщения и обсуждения по проектам, доступным вашей организации."
      />
      <section className="list-surface">
        {isLoading ? <StateView state="loading" title="Загружаем сообщения" /> : null}
        {!isLoading && error ? <StateView state="error" description={error} /> : null}
        {!isLoading && !error && conversations?.length ? (
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
        ) : null}
        {!isLoading && !error && !conversations?.length ? (
          <StateView state="empty" title="Сообщений пока нет" description={CONVERSATIONS_EMPTY_TEXT} />
        ) : null}
      </section>
    </div>
  );
}
