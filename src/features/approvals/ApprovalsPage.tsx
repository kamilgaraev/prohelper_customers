import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ApprovalsPage() {
  const { value: approvals } = useAsyncValue(() => customerPortalService.getApprovals(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Approvals"
        title="Контур согласований"
        description="Очередь решений заказчика: approve, reject, request changes с полной историей комментариев."
      />
      <section className="list-surface">
        {approvals?.map((item) => (
          <article key={item.id} className="list-row list-row--surface">
            <div>
              <strong>{item.title}</strong>
              <p>{item.projectName}</p>
            </div>
            <div className="row-actions">
              <StatusPill
                tone={
                  item.status === 'approved'
                    ? 'success'
                    : item.status === 'changes_requested'
                      ? 'warning'
                      : 'primary'
                }
              >
                {item.deadlineLabel}
              </StatusPill>
              <div className="button-row">
                <button type="button" className="ghost-button">
                  Запросить правки
                </button>
                <button type="button">Согласовать</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

