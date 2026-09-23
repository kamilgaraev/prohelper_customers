import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  describeRevisionChanges,
  matchesExecutiveSearch,
  transmittalActionLabel,
  transmittalStatusLabel,
} from '@features/documents/executiveTransmittalView';
import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import {
  CustomerExecutiveDocumentSet,
  CustomerExecutiveTransmittalAction,
  CustomerLegalDocument,
} from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { Dialog, StateView } from '@shared/ui';

type Severity = 'minor' | 'major' | 'critical';
type ExecutiveAction =
  | {
      type: 'remark';
      documentId: number;
      transmittalId: number;
      versionId: number;
      versionNumber: string;
      body: string;
      severity: Severity;
      operationKey: string;
    }
  | { type: 'transmittal'; set: CustomerExecutiveDocumentSet; action: CustomerExecutiveTransmittalAction; comment: string; operationKey: string };

function requestErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    return Number(error.status);
  }
  return undefined;
}

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('project_id') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const searchQuery = searchParams.get('q') ?? '';
  const [refreshKey, setRefreshKey] = useState(0);
  const [executiveAction, setExecutiveAction] = useState<ExecutiveAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLock, setActionLock] = useState<'none' | 'retry' | 'refresh'>('none');
  const [mustRenewOperationKey, setMustRenewOperationKey] = useState(false);
  const submitLock = useRef(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [legalDocumentError, setLegalDocumentError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { value: documents, error, isLoading: documentsLoading } = useAsyncValue(() => customerPortalService.getDocuments(), []);
  const { value: projects } = useAsyncValue(() => customerPortalService.getProjects(), []);
  const { value: legalDocuments, error: legalError, isLoading: legalLoading } = useAsyncValue(() => customerPortalService.getLegalDocuments(), [refreshKey]);
  const {
    value: transmittalPage,
    error: executiveError,
    isLoading: transmittalsLoading,
  } = useAsyncValue(
    () => customerPortalService.getExecutiveTransmittals(projectId ? { project_id: Number(projectId) } : {}),
    [refreshKey, projectId]
  );
  const transmittalQueryKey = `${projectId}:${refreshKey}`;
  const [settledTransmittalQueryKey, setSettledTransmittalQueryKey] = useState(transmittalQueryKey);
  useEffect(() => {
    if (!transmittalsLoading && (executiveError || transmittalPage !== null)) {
      setSettledTransmittalQueryKey(transmittalQueryKey);
    }
  }, [executiveError, transmittalPage, transmittalQueryKey, transmittalsLoading]);
  const transmittalContextLoading = transmittalsLoading || settledTransmittalQueryKey !== transmittalQueryKey;

  const transmittals = transmittalsLoading ? [] : (transmittalPage?.items ?? []);
  const transmittalsById = useMemo(() => {
    const index = new Map<number, CustomerExecutiveDocumentSet>();
    for (const set of transmittals) {
      if (set.transmittal?.id) {
        index.set(set.transmittal.id, set);
      }
    }
    return index;
  }, [transmittals]);

  const visibleTransmittals = useMemo(() => {
    return transmittals.filter((set) => {
      const transmittal = set.transmittal;
      if (!transmittal) {
        return false;
      }
      if (statusFilter && transmittal.status !== statusFilter) {
        return false;
      }
      return matchesExecutiveSearch(set, searchQuery);
    });
  }, [searchQuery, statusFilter, transmittals]);

  function updateFilter(key: 'project_id' | 'status' | 'q', value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
    setExecutiveAction(null);
    setActionError(null);
    setActionLock('none');
  }

  async function submitExecutiveAction() {
    if (!executiveAction || isSubmittingAction || submitLock.current) return;
    if (executiveAction.type === 'remark' && !executiveAction.body.trim()) return;
    if (executiveAction.type === 'transmittal' && executiveAction.action === 'return' && !executiveAction.comment.trim()) {
      setActionError('Для возврата нужен комментарий.');
      return;
    }

    submitLock.current = true;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      if (executiveAction.type === 'remark') {
        await customerPortalService.addExecutiveDocumentRemark(executiveAction.documentId, {
          operation_key: executiveAction.operationKey,
          transmittal_id: executiveAction.transmittalId,
          version_id: executiveAction.versionId,
          body: executiveAction.body,
          severity: executiveAction.severity,
        });
      } else {
        const { set, action, comment, operationKey } = executiveAction;
        const transmittalId = set.transmittal?.id;
        if (!transmittalId) throw new Error('Не найден идентификатор передачи.');
        const manifestHash = set.transmittal?.manifest_hash;
        if (!manifestHash) throw new Error('Не найден отпечаток передачи.');
        await customerPortalService.actOnExecutiveTransmittal(transmittalId, action, {
          operation_key: operationKey,
          expected_manifest_hash: manifestHash,
          comment: comment.trim() || undefined,
        });
      }
      setExecutiveAction(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      const status = requestErrorStatus(error);
      const message = error instanceof Error ? error.message : 'Не удалось выполнить действие.';
      if (status === 409 || status === 401 || status === 403 || status === 404) {
        setActionLock('refresh');
        setActionError('Передача изменилась. Перечитайте список передач перед повтором.');
      } else if (status === 422) {
        setActionLock('none');
        setMustRenewOperationKey(true);
        setActionError(message || 'Проверьте данные и измените их перед повтором.');
      } else {
        setActionLock('retry');
        setActionError('Сервер не подтвердил результат. Повторите тот же запрос.');
      }
    } finally {
      submitLock.current = false;
      setIsSubmittingAction(false);
    }
  }

  async function openExecutiveVersion(transmittalId: number, versionId: number): Promise<void> {
    setDownloadError(null);
    const target = window.open('about:blank', '_blank');
    if (!target) {
      setDownloadError('Разрешите открытие нового окна для просмотра документа.');
      return;
    }
    target.opener = null;
    try {
      target.location.replace(await customerPortalService.getExecutiveTransmittalVersionUrl(transmittalId, versionId));
    } catch (error) {
      target.close();
      setDownloadError(error instanceof Error ? error.message : 'Не удалось открыть файл.');
    }
  }

  async function openLegalDocumentVersion(versionId: number, purpose: 'preview' | 'download'): Promise<void> {
    const target = window.open('about:blank', '_blank');
    if (target === null) {
      setLegalDocumentError('Разрешите открытие нового окна для просмотра документа.');
      return;
    }
    target.opener = null;
    setLegalDocumentError(null);
    try {
      target.location.replace(await customerPortalService.getLegalDocumentUrl(versionId, purpose));
    } catch (error) {
      target.close();
      setLegalDocumentError(error instanceof Error ? error.message : 'Не удалось открыть документ.');
    }
  }

  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Документы" title="Центр документов проекта" description="Единая точка доступа к документам по доступным проектам." />
      <section className="list-surface">
        {legalLoading ? <StateView state="loading" title="Загружаем юридические документы" /> : null}
        {!legalLoading && legalError ? <StateView state="error" description={legalError} /> : null}
        {legalDocumentError ? (
          <div className="form-error" role="alert">
            {legalDocumentError}
          </div>
        ) : null}
        {!legalLoading && !legalError && legalDocuments?.map((document: CustomerLegalDocument) => (
          <article key={`legal-${document.id}`} className="list-row list-row--surface">
            <div>
              <strong>{document.title}</strong>
              <p>{document.document_number ?? document.document_type}</p>
              {document.versions
                .filter((version) => version.processing_status === 'ready')
                .slice(0, 3)
                .map((version) => (
                  <p key={`legal-version-${document.id}-${version.id}`}>
                    {version.version_number ?? 'Версия'}
                    {version.original_filename ? ` · ${version.original_filename}` : ''} ·{' '}
                    <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(version.id, 'preview')}>
                      Открыть
                    </button>
                  </p>
                ))}
            </div>
            <div className="row-actions">
              {document.current_version?.processing_status === 'ready' ? (
                <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(document.current_version!.id, 'preview')}>
                  Просмотреть
                </button>
              ) : null}
              {document.current_version?.processing_status === 'ready' ? (
                <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(document.current_version!.id, 'download')}>
                  Скачать
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {documentsLoading ? <StateView state="loading" title="Загружаем документы" /> : null}
        {!documentsLoading && error ? <StateView state="error" description={error} /> : null}
        {!documentsLoading && !error && documents?.length ? (
          documents.map((item) => (
            <article key={`document-${item.id}`} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.projectName ?? 'Без привязки к проекту'}</p>
                <Link to={`/dashboard/issues?project_id=${item.projectId ?? ''}&file_id=${item.id}`}>Создать замечание</Link>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.category ?? item.type ?? 'Документ'}</p>
                <StatusPill tone="neutral">{item.uploadedAtLabel ?? 'Без даты'}</StatusPill>
              </div>
            </article>
          ))
        ) : null}
        {!legalLoading && !legalError && !documentsLoading && !error && !documents?.length ? <StateView state="empty" title="Документы пока не опубликованы" /> : null}
      </section>

      <SectionHeading
        eyebrow="Исполнительная документация"
        title="Комплекты исполнительной документации"
        description="Получение, возврат и приёмка относятся к конкретной полученной редакции комплекта."
      />
      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <div className="profile-list">
          <label>
            <span>Проект</span>
            <select value={projectId} onChange={(event) => updateFilter('project_id', event.target.value)}>
              <option value="">Все доступные проекты</option>
              {(projects ?? []).map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус передачи</span>
            <select value={statusFilter} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Все загруженные</option>
              <option value="sent">Отправлено</option>
              <option value="received">Получено</option>
              <option value="returned">Возвращено</option>
              <option value="accepted">Принято</option>
            </select>
          </label>
          <label>
            <span>Поиск</span>
            <input
              type="search"
              value={searchQuery}
              placeholder="Номер комплекта, название или документ"
              onChange={(event) => updateFilter('q', event.target.value)}
            />
          </label>
        </div>
        <p className="conversation-preview">
          {!transmittalContextLoading && transmittalPage?.meta
            ? `Страница ${transmittalPage.meta.current_page} из ${transmittalPage.meta.last_page}, всего ${transmittalPage.meta.total}.`
            : 'Сервер отдаёт последние передачи без постраничного просмотра. Поиск и статус применяются к уже загруженному списку.'}
        </p>
      </section>
      <section className="list-surface">
        {!transmittalContextLoading && executiveError ? <StateView state="error" description={executiveError} /> : null}
        {downloadError ? (
          <div className="form-error" role="alert">
            {downloadError}
          </div>
        ) : null}
        {transmittalContextLoading ? <StateView state="loading" title="Загружаем комплекты выбранного проекта" /> : null}
        {!transmittalContextLoading && !executiveError && visibleTransmittals.length ? (
          visibleTransmittals.map((set) => {
            const transmittal = set.transmittal;
            if (!transmittal) return null;
            const previous = transmittal.previous_transmittal_id ? transmittalsById.get(transmittal.previous_transmittal_id) : undefined;
            const revisionLines = describeRevisionChanges(set, previous);
            return (
              <article key={`transmittal-${transmittal.id}`} className="list-row list-row--surface">
                <div>
                  <strong>
                    {set.set_number} · {set.title}
                  </strong>
                  <p>
                    {set.project?.name ?? `Проект #${set.project_id}`} · {set.stage_name ?? 'Этап не указан'} · {set.zone_name ?? 'Зона не указана'}
                  </p>
                  <p>
                    Передача {transmittal.transmittal_number} · {new Date(transmittal.transmitted_at).toLocaleDateString('ru-RU')}
                  </p>
                  <StatusPill tone={transmittal.status === 'returned' ? 'warning' : transmittal.status === 'accepted' ? 'success' : 'neutral'}>
                    {transmittalStatusLabel(transmittal.status)}
                  </StatusPill>
                  {transmittal.received_at ? <p>Получено: {new Date(transmittal.received_at).toLocaleString('ru-RU')}</p> : null}
                  {transmittal.decision_at ? <p>Решение: {new Date(transmittal.decision_at).toLocaleString('ru-RU')}</p> : null}
                  {transmittal.comment ? <p>Комментарий отправителя: {transmittal.comment}</p> : null}
                  {transmittal.decision_comment ? <p>Комментарий к решению: {transmittal.decision_comment}</p> : null}
                  {revisionLines.length ? (
                    <div>
                      <p>Различия с предыдущей передачей:</p>
                      {revisionLines.map((line) => (
                        <p key={`${transmittal.id}-${line}`}>{line}</p>
                      ))}
                    </div>
                  ) : transmittal.previous_transmittal_id ? (
                    <p>Повторная передача без изменения состава редакций.</p>
                  ) : null}
                  <div className="page-stack">
                    {(set.documents ?? []).map((document) => (
                      <div key={`transmittal-${transmittal.id}-document-${document.id}`}>
                        <strong>{document.title}</strong>
                        {(transmittal.changed_document_ids ?? []).includes(document.id) ? <StatusPill tone="warning">Изменена редакция</StatusPill> : null}
                        {(document.versions ?? []).map((version) => (
                          <p key={`transmittal-${transmittal.id}-document-${document.id}-version-${version.id}`}>
                            <button type="button" className="text-button" onClick={() => void openExecutiveVersion(transmittal.id, version.id)}>
                              Редакция {version.version_number}
                            </button>
                            {version.content_hash ? ` · ${version.content_hash.slice(0, 12)}` : null}{' '}
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => {
                                setActionLock('none');
                                setMustRenewOperationKey(false);
                                setActionError(null);
                                setExecutiveAction({
                                  type: 'remark',
                                  documentId: document.id,
                                  transmittalId: transmittal.id,
                                  versionId: version.id,
                                  versionNumber: version.version_number,
                                  body: '',
                                  severity: 'major',
                                  operationKey: crypto.randomUUID(),
                                });
                              }}
                            >
                              Добавить замечание
                            </button>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="row-actions">
                  {transmittal.available_actions.map((action) => (
                    <button
                      key={`transmittal-${transmittal.id}-action-${action}`}
                      type="button"
                      className={action === 'receive' ? 'primary-button' : 'secondary-button'}
                      onClick={() => {
                        setActionLock('none');
                        setMustRenewOperationKey(false);
                        setActionError(null);
                        setExecutiveAction({ type: 'transmittal', set, action, comment: '', operationKey: crypto.randomUUID() });
                      }}
                    >
                      {transmittalActionLabel(action)}
                    </button>
                  ))}
                </div>
              </article>
            );
          })
        ) : !transmittalContextLoading && !executiveError && transmittals.length && (searchQuery || statusFilter) ? (
          <StateView state="empty" title="Передачи не найдены" description="Измените поиск или статус." />
        ) : !transmittalContextLoading && !executiveError ? (
          <StateView state="empty" title="Передач пока нет" />
        ) : null}
      </section>

      <Dialog
        open={executiveAction !== null}
        title={executiveAction?.type === 'remark'
          ? `Замечание к полученной редакции ${executiveAction.versionNumber}`
          : executiveAction
            ? `${executiveAction.action === 'receive' ? 'Получение' : executiveAction.action === 'return' ? 'Возврат' : 'Принятие'} передачи`
            : 'Действие с передачей'}
        onClose={() => { if (!isSubmittingAction) setExecutiveAction(null); }}
      >
        {executiveAction ? (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitExecutiveAction();
            }}
          >
            {actionError ? (
              <div className="form-error" role="alert">
                {actionError}
              </div>
            ) : null}
            {actionLock === 'refresh' ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setExecutiveAction(null);
                  setActionLock('none');
                  setRefreshKey((current) => current + 1);
                }}
              >
                Перечитать передачу
              </button>
            ) : null}
            {executiveAction.type === 'remark' ? (
              <>
                <p>Редакция {executiveAction.versionNumber}</p>
                <label>
                  Важность
                  <select
                    disabled={isSubmittingAction || actionLock !== 'none'}
                    value={executiveAction.severity}
                    onChange={(event) => {
                      setMustRenewOperationKey(false);
                      setExecutiveAction((current) =>
                        current?.type === 'remark'
                          ? {
                              ...current,
                              severity: event.target.value as Severity,
                              operationKey: mustRenewOperationKey ? crypto.randomUUID() : current.operationKey,
                            }
                          : current
                      );
                    }}
                  >
                    <option value="minor">Низкая</option>
                    <option value="major">Средняя</option>
                    <option value="critical">Критическая</option>
                  </select>
                </label>
                <label>
                  Текст замечания
                  <textarea
                    disabled={isSubmittingAction || actionLock !== 'none'}
                    required
                    value={executiveAction.body}
                    onChange={(event) => {
                      setMustRenewOperationKey(false);
                      setExecutiveAction((current) =>
                        current?.type === 'remark'
                          ? { ...current, body: event.target.value, operationKey: mustRenewOperationKey ? crypto.randomUUID() : current.operationKey }
                          : current
                      );
                    }}
                  />
                </label>
              </>
            ) : (
              <label>
                Комментарий{executiveAction.action === 'return' ? ' (обязательно)' : ''}
                <textarea
                  disabled={isSubmittingAction || actionLock !== 'none'}
                  required={executiveAction.action === 'return'}
                  value={executiveAction.comment}
                  onChange={(event) => {
                    const nextKey = mustRenewOperationKey ? crypto.randomUUID() : executiveAction.operationKey;
                    setMustRenewOperationKey(false);
                    setExecutiveAction((current) => (current?.type === 'transmittal' ? { ...current, comment: event.target.value, operationKey: nextKey } : current));
                  }}
                />
              </label>
            )}
            <div className="form-actions">
              <button type="button" className="secondary-button" disabled={isSubmittingAction || actionLock !== 'none'} onClick={() => setExecutiveAction(null)}>
                Отмена
              </button>
              <button type="submit" className="primary-button" disabled={isSubmittingAction || actionLock === 'refresh'}>
                {isSubmittingAction ? 'Выполняется…' : actionLock === 'refresh' ? 'Требуется перечитать' : 'Повторить / выполнить'}
              </button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
