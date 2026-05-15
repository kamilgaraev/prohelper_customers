import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { CustomerHandoverScope } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

const statusLabels: Record<string, string> = {
  planned: 'Запланирована',
  in_progress: 'Осмотр',
  findings_open: 'Есть замечания',
  ready_for_reinspection: 'Повторная проверка',
  accepted: 'Принята',
  handed_over: 'Передана',
  reopened: 'Открыта повторно',
  rejected: 'Отклонена',
  open: 'Открыто',
  resolved: 'Устранено',
  missing: 'Не хватает',
  draft: 'На проверке',
  approved: 'Подтвержден',
};

function statusTone(scope: CustomerHandoverScope): 'primary' | 'neutral' | 'success' | 'warning' {
  if (scope.workflow_summary?.problem_flags?.some((flag) => flag.severity === 'warning' || flag.severity === 'critical')) {
    return 'warning';
  }

  if (scope.status === 'accepted' || scope.status === 'handed_over') {
    return 'success';
  }

  if (scope.status === 'rejected') {
    return 'neutral';
  }

  return 'primary';
}

function formatStatus(status: string): string {
  return statusLabels[status] ?? status;
}

export function HandoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => ({
      project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
    }),
    [searchParams]
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const { value: scopes, error } = useAsyncValue(
    () => customerPortalService.getHandoverScopes(filters),
    [searchParams.toString(), refreshToken]
  );
  const [selectedScope, setSelectedScope] = useState<CustomerHandoverScope | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'handover' | 'reject' | null>(null);

  useEffect(() => {
    if (!scopes?.length) {
      setSelectedScope(null);
      return;
    }

    const selectedId = Number(searchParams.get('selected'));
    const nextSelected = selectedId ? scopes.find((scope) => scope.id === selectedId) : undefined;

    if (nextSelected) {
      setSelectedScope(nextSelected);
      return;
    }

    if (!selectedScope || !scopes.some((scope) => scope.id === selectedScope.id)) {
      setSelectedScope(scopes[0]);
    }
  }, [scopes, searchParams, selectedScope]);

  const scopeOptions = scopes ?? [];
  const openFindings = selectedScope?.findings.filter((finding) => finding.status === 'open') ?? [];
  const documents = selectedScope?.handover_package?.documents ?? [];
  const requiredDocuments = documents.filter((document) => document.is_required);
  const approvedRequiredDocuments = requiredDocuments.filter((document) => document.status === 'approved');
  const canSignHandover = Boolean(
    selectedScope
      && selectedScope.status === 'accepted'
      && openFindings.length === 0
      && requiredDocuments.length > 0
      && requiredDocuments.length === approvedRequiredDocuments.length
  );
  const canRejectHandover = selectedScope?.status === 'accepted' || selectedScope?.status === 'handed_over';

  const signHandover = async () => {
    if (!selectedScope || !canSignHandover) {
      return;
    }

    setActionError(null);
    setSubmittingAction('handover');
    try {
      await customerPortalService.signHandoverScope(selectedScope.id);
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось подтвердить передачу зоны');
    } finally {
      setSubmittingAction(null);
    }
  };

  const rejectHandover = async () => {
    if (!selectedScope || !canRejectHandover || !rejectReason.trim()) {
      return;
    }

    setActionError(null);
    setSubmittingAction('reject');
    try {
      await customerPortalService.rejectHandoverScope(selectedScope.id, {
        reason: rejectReason.trim(),
      });
      setRejectReason('');
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось вернуть зону на доработку');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Handover"
        title="Приемка зон"
        description="Контроль зон, замечаний и комплекта документов перед передачей заказчику."
      />

      {error ? <div className="form-error">{error}</div> : null}
      {actionError ? <div className="form-error">{actionError}</div> : null}

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <div className="profile-list">
          <label>
            <span>ID проекта</span>
            <input
              value={filters.project_id ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) {
                  next.set('project_id', event.target.value);
                } else {
                  next.delete('project_id');
                }
                setSearchParams(next);
              }}
            />
          </label>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Зоны</h3>
            <span>{scopeOptions.length}</span>
          </div>
          <div className="list-stack">
            {scopeOptions.length ? (
              scopeOptions.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  className="list-row"
                  onClick={() => {
                    setSelectedScope(scope);
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set('selected', String(scope.id));
                      return next;
                    });
                  }}
                >
                  <div>
                    <strong>{scope.title}</strong>
                    <p>{scope.project?.name ?? `Проект #${scope.project_id}`}</p>
                    <p>{scope.location?.path ?? scope.location?.name ?? 'Локация не указана'}</p>
                  </div>
                  <StatusPill tone={statusTone(scope)}>{formatStatus(scope.status)}</StatusPill>
                </button>
              ))
            ) : (
              <p className="empty-state">Зон приемки по выбранным условиям пока нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>{selectedScope?.title ?? 'Детали приемки'}</h3>
            {selectedScope ? <StatusPill tone={statusTone(selectedScope)}>{formatStatus(selectedScope.status)}</StatusPill> : null}
          </div>
          {selectedScope ? (
            <>
              <div className="profile-list">
                <div>
                  <span>Проект</span>
                  <strong>{selectedScope.project?.name ?? `#${selectedScope.project_id}`}</strong>
                </div>
                <div>
                  <span>Локация</span>
                  <strong>{selectedScope.location?.path ?? selectedScope.location?.name ?? 'Не указана'}</strong>
                </div>
                <div>
                  <span>Открытые замечания</span>
                  <strong>{openFindings.length}</strong>
                </div>
                <div>
                  <span>Документы</span>
                  <strong>{approvedRequiredDocuments.length} / {requiredDocuments.length}</strong>
                </div>
              </div>

              {selectedScope.description ? <p>{selectedScope.description}</p> : null}

              <div className="profile-list">
                <div>
                  <span>Решение заказчика</span>
                  <strong>{canSignHandover ? 'Готово к подтверждению' : 'Ожидает готовности комплекта'}</strong>
                </div>
                <label>
                  <span>Комментарий при возврате</span>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    disabled={!canRejectHandover || submittingAction !== null}
                    rows={3}
                  />
                </label>
                <div className="button-row button-row--compact">
                  <button type="button" onClick={() => void signHandover()} disabled={!canSignHandover || submittingAction !== null}>
                    Подтвердить передачу
                  </button>
                  <button
                    type="button"
                    onClick={() => void rejectHandover()}
                    disabled={!canRejectHandover || !rejectReason.trim() || submittingAction !== null}
                  >
                    Вернуть на доработку
                  </button>
                </div>
              </div>

              <div className="list-stack">
                <h3>Punch-list</h3>
                {selectedScope.findings.length ? selectedScope.findings.map((finding) => (
                  <div key={finding.id} className="list-row">
                    <div>
                      <strong>{finding.title}</strong>
                      <p>{finding.description ?? 'Описание не указано'}</p>
                    </div>
                    <StatusPill tone={finding.status === 'resolved' ? 'success' : 'warning'}>{formatStatus(finding.status)}</StatusPill>
                  </div>
                )) : <p className="empty-state">Замечаний нет.</p>}
              </div>

              <div className="list-stack">
                <h3>Комплект передачи</h3>
                {documents.length ? documents.map((document) => (
                  <div key={document.id} className="list-row">
                    <div>
                      <strong>{document.title}</strong>
                      <p>{document.is_required ? 'Обязательный документ' : 'Дополнительный документ'}</p>
                    </div>
                    <StatusPill tone={document.status === 'approved' ? 'success' : 'warning'}>{formatStatus(document.status)}</StatusPill>
                  </div>
                )) : <p className="empty-state">Комплект передачи еще не опубликован.</p>}
              </div>
            </>
          ) : (
            <p className="empty-state">Выберите зону, чтобы посмотреть замечания и документы.</p>
          )}
        </article>
      </section>
    </div>
  );
}
