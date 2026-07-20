import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ApprovalsPage() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [legalActionInProgress, setLegalActionInProgress] = useState<string | null>(null);
  const [legalActionError, setLegalActionError] = useState<string | null>(null);
  const legalActionKeys = useRef(new Map<string, string>());
  const { value: approvals, error } = useAsyncValue(() => customerPortalService.getApprovals(), []);
  const {
    value: changeApprovals,
    error: changeError,
  } = useAsyncValue(() => customerPortalService.getChangeApprovals(), [refreshToken]);
  const { value: legalDocuments, error: legalError } = useAsyncValue(() => customerPortalService.getLegalDocuments(), [refreshToken]);

  const approveChange = useCallback(async (changeId: number) => {
    await customerPortalService.approveChangeRequest(changeId, {
      comment: 'Согласовано из кабинета заказчика',
    });
    setRefreshToken((current) => current + 1);
  }, []);

  async function decideLegalDocumentAction(
    documentId: number,
    action: 'approve' | 'reject' | 'return',
    stepId: number,
    instanceLockVersion: number,
    stepLockVersion: number,
    requiresComment: boolean,
  ): Promise<void> {
    const actionKey = `${documentId}:${stepId}:${action}`;
    const idempotencyKey = legalActionKeys.current.get(actionKey) ?? crypto.randomUUID();
    legalActionKeys.current.set(actionKey, idempotencyKey);
    setLegalActionInProgress(actionKey);
    setLegalActionError(null);

    try {
      await customerPortalService.decideLegalDocumentStep(stepId, action, {
        instance_lock_version: instanceLockVersion,
        step_lock_version: stepLockVersion,
        comment: requiresComment ? 'Решение направлено из кабинета заказчика' : undefined,
        idempotency_key: idempotencyKey,
      });
      legalActionKeys.current.delete(actionKey);
      setRefreshToken((current) => current + 1);
    } catch (actionError) {
      setLegalActionError(actionError instanceof Error ? actionError.message : 'Не удалось выполнить действие по документу.');
      setRefreshToken((current) => current + 1);
    } finally {
      setLegalActionInProgress(null);
    }
  }

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
        {legalError ? <div className="form-error">{legalError}</div> : null}
        {legalActionError ? <div className="form-error" role="alert">{legalActionError}</div> : null}
        {legalDocuments?.flatMap((document) => (document.workflow_summary.available_action_details ?? [])
          .filter((action) => action.enabled && action.target_step_id !== null)
          .map((action) => (
            <article key={`legal-${document.id}-${action.action}`} className="list-row list-row--surface">
              <div><strong>{document.title}</strong><p>Юридический документ</p></div>
              <div className="row-actions">
                <button type="button" className="button button--primary" disabled={legalActionInProgress === `${document.id}:${action.target_step_id}:${action.action}`} onClick={() => void decideLegalDocumentAction(document.id, action.action, action.target_step_id!, action.expected_instance_lock_version ?? 0, action.expected_step_lock_version ?? 0, action.requires_comment ?? false)}>
                  {action.action === 'approve' ? 'Согласовать' : action.action === 'reject' ? 'Отклонить' : 'Вернуть на доработку'}
                </button>
              </div>
            </article>
          )))}
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
