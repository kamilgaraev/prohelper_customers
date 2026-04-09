import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ApprovalsPage() {
  const { value: approvals, error } = useAsyncValue(() => customerPortalService.getApprovals(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Approvals"
        title="Контур согласований"
        description="Здесь отображаются акты и документы, по которым backend уже отдает customer-видимость. Карточка согласования показывает привязку к договору, если она есть."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {approvals?.length ? (
          approvals.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.projectName}</p>
                {item.contractNumber || item.contractSubject ? (
                  <p>{[item.contractNumber, item.contractSubject].filter(Boolean).join(' • ')}</p>
                ) : null}
                {item.contractId ? (
                  <p>
                    <Link to={`/dashboard/contracts/${item.contractId}`}>Открыть договор</Link>
                  </p>
                ) : null}
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
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Открытых согласований для customer-контура сейчас нет.</p>
        )}
      </section>
    </div>
  );
}
