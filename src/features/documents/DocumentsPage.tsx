import { useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { CustomerExecutiveDocumentSet } from '@shared/types/dashboard';

type ExecutiveAction =
  | { type: 'remark'; documentId: number; body: string; severity: 'minor' | 'major' | 'critical' }
  | { type: 'acknowledge'; set: CustomerExecutiveDocumentSet; comment: string };

export function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [executiveAction, setExecutiveAction] = useState<ExecutiveAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const { value: documents, error } = useAsyncValue(() => customerPortalService.getDocuments(), []);
  const { value: executiveSets, error: executiveError } = useAsyncValue(
    () => customerPortalService.getExecutiveDocumentSets(),
    [refreshKey]
  );

  async function submitExecutiveAction() {
    if (!executiveAction) {
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      if (executiveAction.type === 'remark') {
        await customerPortalService.addExecutiveDocumentRemark(executiveAction.documentId, {
          body: executiveAction.body,
          severity: executiveAction.severity,
        });
      } else {
        await customerPortalService.acknowledgeExecutiveDocumentSet(executiveAction.set.id, {
          comment: executiveAction.comment || undefined,
        });
      }

      setExecutiveAction(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось выполнить действие');
    } finally {
      setIsSubmittingAction(false);
    }
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Documents"
        title="Центр документов заказчика"
        description="Единая точка доступа к документам по проектам с возможностью сразу открыть замечание по нужному файлу."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {documents?.length ? (
          documents.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.projectName ?? 'Без привязки к проекту'}</p>
                <p>
                  <Link to={`/dashboard/issues?project_id=${item.projectId ?? ''}&file_id=${item.id}`}>Создать замечание</Link>
                </p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.category ?? item.type ?? 'Документ'}</p>
                <StatusPill tone="neutral">{item.uploadedAtLabel ?? 'Без даты'}</StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Документы пока не опубликованы.</p>
        )}
      </section>

      <SectionHeading
        eyebrow="Executive documentation"
        title="Исполнительная документация"
        description="Переданные комплекты исполнительной документации по объектам и зонам."
      />
      <section className="list-surface">
        {executiveError ? <div className="form-error">{executiveError}</div> : null}
        {executiveSets?.length ? (
          executiveSets.map((set) => (
            <article key={set.id} className="list-row list-row--surface">
              <div>
                <strong>{set.set_number} · {set.title}</strong>
                <p>{set.project?.name ?? `Проект #${set.project_id}`} · {set.stage_name ?? 'Этап не указан'} · {set.zone_name ?? 'Зона не указана'}</p>
                {set.transmittal ? (
                  <p>Передача {set.transmittal.transmittal_number}</p>
                ) : null}
                <div className="page-stack">
                  {(set.documents ?? []).map((document) => (
                    <div key={document.id}>
                      <strong>{document.title}</strong>
                      <p>{document.document_type_label} · {document.status_label}</p>
                      {(document.versions ?? []).map((version) => (
                        <p key={version.id}>
                          <a href={version.file_url} target="_blank" rel="noreferrer">
                            Версия {version.version_number}
                          </a>
                        </p>
                      ))}
                      <p>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setExecutiveAction({
                            type: 'remark',
                            documentId: document.id,
                            body: '',
                            severity: 'major',
                          })}
                        >
                          Добавить замечание
                        </button>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{set.stage_name ?? set.zone_name ?? 'Комплект ИД'}</p>
                <StatusPill tone="success">{set.status_label}</StatusPill>
                {set.transmittal?.acknowledged ? (
                  <StatusPill tone="success">Получено</StatusPill>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setExecutiveAction({ type: 'acknowledge', set, comment: '' })}
                  >
                    Подтвердить получение
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Переданные комплекты исполнительной документации пока отсутствуют.</p>
        )}
      </section>

      {executiveAction ? (
        <div className="modal-backdrop" role="presentation">
          <form
            className="modal-card"
            onSubmit={(event) => {
              event.preventDefault();
              void submitExecutiveAction();
            }}
          >
            <h3>{executiveAction.type === 'remark' ? 'Замечание по документу' : 'Подтверждение получения'}</h3>
            {actionError ? <div className="form-error">{actionError}</div> : null}
            {executiveAction.type === 'remark' ? (
              <>
                <label>
                  Важность
                  <select
                    value={executiveAction.severity}
                    onChange={(event) => setExecutiveAction((current) => current?.type === 'remark'
                      ? { ...current, severity: event.target.value as 'minor' | 'major' | 'critical' }
                      : current)}
                  >
                    <option value="minor">Низкая</option>
                    <option value="major">Средняя</option>
                    <option value="critical">Критическая</option>
                  </select>
                </label>
                <label>
                  Текст замечания
                  <textarea
                    required
                    value={executiveAction.body}
                    onChange={(event) => setExecutiveAction((current) => current?.type === 'remark'
                      ? { ...current, body: event.target.value }
                      : current)}
                  />
                </label>
              </>
            ) : (
              <label>
                Комментарий
                <textarea
                  value={executiveAction.comment}
                  onChange={(event) => setExecutiveAction((current) => current?.type === 'acknowledge'
                    ? { ...current, comment: event.target.value }
                    : current)}
                />
              </label>
            )}
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setExecutiveAction(null)}>
                Отмена
              </button>
              <button type="submit" className="primary-button" disabled={isSubmittingAction}>
                Выполнить
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
