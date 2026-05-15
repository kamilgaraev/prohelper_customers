import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ApprovalsPage() {
  const [refreshToken, setRefreshToken] = useState(0);
  const { value: approvals, error } = useAsyncValue(() => customerPortalService.getApprovals(), []);
  const {
    value: changeApprovals,
    error: changeError,
  } = useAsyncValue(() => customerPortalService.getChangeApprovals(), [refreshToken]);

  const approveChange = useCallback(async (changeId: number) => {
    await customerPortalService.approveChangeRequest(changeId, {
      comment: 'Согласовано из кабинета заказчика',
    });
    setRefreshToken((current) => current + 1);
  }, []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Approvals"
        title="Контур согласований"
        description="Акты, документы и изменения проекта, которые требуют решения заказчика."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {changeError ? <div className="form-error">{changeError}</div> : null}
        {approvals?.map((item) => (
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
              <p>
                <Link to={`/dashboard/issues?project_id=${item.projectId ?? ''}&performance_act_id=${item.id}`}>
                  Создать замечание
                </Link>
              </p>
            </div>
            <div className="row-actions">
              <StatusPill tone={item.status === 'approved' ? 'success' : item.status === 'changes_requested' ? 'warning' : 'primary'}>
                {item.deadlineLabel}
              </StatusPill>
            </div>
          </article>
        ))}
        {changeApprovals?.map((change) => (
          <article key={`change-${change.id}`} className="list-row list-row--surface">
            <div>
              <strong>{change.title}</strong>
              <p>{change.change_number}</p>
              <p>
                {[change.impact?.cost_delta ? `${Number(change.impact.cost_delta).toLocaleString('ru-RU')} ₽` : null,
                  change.impact?.schedule_delta_days ? `${change.impact.schedule_delta_days} дн.` : null]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              {change.problem_flags?.map((flag) => (
                <p key={flag.code}>{flag.message}</p>
              ))}
            </div>
            <div className="row-actions">
              <StatusPill tone={change.status === 'approved' ? 'success' : 'warning'}>
                {change.status === 'approved' ? 'Согласовано' : 'Ожидает решения'}
              </StatusPill>
              {change.status === 'customer_review' ? (
                <button type="button" className="button button--primary" onClick={() => void approveChange(change.id)}>
                  Согласовать изменение
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!approvals?.length && !changeApprovals?.length ? (
          <p className="empty-state">Открытых согласований для кабинета заказчика сейчас нет.</p>
        ) : null}
      </section>
    </div>
  );
}
