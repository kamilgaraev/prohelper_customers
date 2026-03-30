import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ConversationsPage() {
  const { value: conversations } = useAsyncValue(() => customerPortalService.getConversations(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Conversations"
        title="Проектные коммуникации"
        description="Отдельный customer-контур для переписки по проектам, документам и согласованиям."
      />
      <section className="list-surface">
        {conversations?.map((item) => (
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
        ))}
      </section>
    </div>
  );
}

