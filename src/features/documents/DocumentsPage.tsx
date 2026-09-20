import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import {
  CustomerExecutiveDocumentSet,
  CustomerExecutiveTransmittalAction,
  CustomerLegalDocument,
} from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

type Severity = 'minor' | 'major' | 'critical';
type ExecutiveAction =
  | { type: 'remark'; documentId: number; transmittalId: number; versionId: number; body: string; severity: Severity; operationKey: string }
  | { type: 'transmittal'; set: CustomerExecutiveDocumentSet; action: CustomerExecutiveTransmittalAction; comment: string; operationKey: string };

function transmittalStatusLabel(status: string): string {
  return ({ sent: 'Отправлено', received: 'Получено', returned: 'Возвращено', accepted: 'Принято' } as Record<string, string>)[status] ?? status;
}

export function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [executiveAction, setExecutiveAction] = useState<ExecutiveAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLock, setActionLock] = useState<'none' | 'retry' | 'refresh'>('none');
  const [mustRenewOperationKey, setMustRenewOperationKey] = useState(false);
  const submitLock = useRef(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [legalDocumentError, setLegalDocumentError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { value: documents, error } = useAsyncValue(() => customerPortalService.getDocuments(), []);
  const { value: legalDocuments, error: legalError } = useAsyncValue(() => customerPortalService.getLegalDocuments(), [refreshKey]);
  const { value: executiveSets, error: executiveError } = useAsyncValue(
    () => customerPortalService.getExecutiveTransmittals(),
    [refreshKey]
  );

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
      const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
      if (status === 409 || status === 401 || status === 403 || status === 404) {
        setActionLock('refresh');
        setActionError('Передача изменилась. Перечитайте список передач перед повтором.');
      } else if (status === 422) {
        setActionLock('none');
        setMustRenewOperationKey(true);
        setActionError('Проверьте данные и измените их перед повтором.');
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
      <SectionHeading eyebrow="Documents" title="Центр документов заказчика" description="Единая точка доступа к документам по проектам." />
      <section className="list-surface">
        {legalError ? <div className="form-error">{legalError}</div> : null}
        {legalDocumentError ? <div className="form-error" role="alert">{legalDocumentError}</div> : null}
        {legalDocuments?.map((document: CustomerLegalDocument) => (
          <article key={`legal-${document.id}`} className="list-row list-row--surface">
            <div>
              <strong>{document.title}</strong>
              <p>{document.document_number ?? document.document_type}</p>
              {document.versions.filter((version) => version.processing_status === 'ready').slice(0, 3).map((version) => (
                <p key={`legal-version-${document.id}-${version.id}`}>
                  {version.version_number ?? 'Версия'}{version.original_filename ? ` · ${version.original_filename}` : ''} · <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(version.id, 'preview')}>Открыть</button>
                </p>
              ))}
            </div>
            <div className="row-actions">
              {document.current_version?.processing_status === 'ready' ? <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(document.current_version!.id, 'preview')}>Просмотреть</button> : null}
              {document.current_version?.processing_status === 'ready' ? <button type="button" className="text-button" onClick={() => void openLegalDocumentVersion(document.current_version!.id, 'download')}>Скачать</button> : null}
            </div>
          </article>
        ))}
        {error ? <div className="form-error">{error}</div> : null}
        {documents?.length ? documents.map((item) => (
          <article key={`document-${item.id}`} className="list-row list-row--surface">
            <div><strong>{item.title}</strong><p>{item.projectName ?? 'Без привязки к проекту'}</p><Link to={`/dashboard/issues?project_id=${item.projectId ?? ''}&file_id=${item.id}`}>Создать замечание</Link></div>
            <div className="row-actions"><p className="conversation-preview">{item.category ?? item.type ?? 'Документ'}</p><StatusPill tone="neutral">{item.uploadedAtLabel ?? 'Без даты'}</StatusPill></div>
          </article>
        )) : <p className="empty-state">Документы пока не опубликованы.</p>}
      </section>

      <SectionHeading eyebrow="Executive documentation" title="Исполнительная документация" description="Передачи комплектов с фиксированными версиями документов." />
      <section className="list-surface">
        {executiveError ? <div className="form-error">{executiveError}</div> : null}
        {downloadError ? <div className="form-error" role="alert">{downloadError}</div> : null}
        <p className="conversation-preview">Показаны последние 25 передач.</p>
        {executiveSets?.length ? executiveSets.map((set) => {
          const transmittal = set.transmittal;
          if (!transmittal) return null;
          return (
            <article key={`transmittal-${transmittal.id}`} className="list-row list-row--surface">
              <div>
                <strong>{set.set_number} · {set.title}</strong>
                <p>{set.project?.name ?? `Проект #${set.project_id}`} · {set.stage_name ?? 'Этап не указан'} · {set.zone_name ?? 'Зона не указана'}</p>
                <p>Передача {transmittal.transmittal_number} · {new Date(transmittal.transmitted_at).toLocaleDateString('ru-RU')}</p>
                <StatusPill tone={transmittal.status === 'returned' ? 'warning' : transmittal.status === 'accepted' ? 'success' : 'neutral'}>{transmittalStatusLabel(transmittal.status)}</StatusPill>
                {transmittal.received_at ? <p>Получено: {new Date(transmittal.received_at).toLocaleString('ru-RU')}</p> : null}
                {transmittal.decision_at ? <p>Решение: {new Date(transmittal.decision_at).toLocaleString('ru-RU')}</p> : null}
                {transmittal.comment ? <p>Комментарий отправителя: {transmittal.comment}</p> : null}
                {transmittal.decision_comment ? <p>Комментарий к решению: {transmittal.decision_comment}</p> : null}
                {transmittal.previous_transmittal_id ? <p>Предыдущая передача: {transmittal.previous_transmittal_id}</p> : null}
                {transmittal.changed_document_ids.length ? <p>Изменения в документах: {(set.documents ?? []).filter((document) => transmittal.changed_document_ids.includes(document.id)).map((document) => document.title).join(', ')}</p> : null}
                <div className="page-stack">
                  {(set.documents ?? []).map((document) => (
                    <div key={`transmittal-${transmittal.id}-document-${document.id}`}>
                      <strong>{document.title}</strong>
                      {transmittal.changed_document_ids.includes(document.id) ? <StatusPill tone="warning">Изменено</StatusPill> : null}
                      {(document.versions ?? []).map((version) => (
                        <p key={`transmittal-${transmittal.id}-document-${document.id}-version-${version.id}`}>
                          <button type="button" className="text-button" onClick={() => void openExecutiveVersion(transmittal.id, version.id)}>Версия {version.version_number}</button>
                          {version.content_hash ? ` · ${version.content_hash.slice(0, 12)}` : null}
                        </p>
                      ))}
                      {(document.versions ?? [])[0] ? <button type="button" className="text-button" onClick={() => { setActionLock('none'); setMustRenewOperationKey(false); setActionError(null); setExecutiveAction({ type: 'remark', documentId: document.id, transmittalId: transmittal.id, versionId: document.versions![0].id, body: '', severity: 'major', operationKey: crypto.randomUUID() }); }}>Добавить замечание</button> : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="row-actions">
                {transmittal.available_actions.map((action) => <button key={`transmittal-${transmittal.id}-action-${action}`} type="button" className={action === 'receive' ? 'primary-button' : 'secondary-button'} onClick={() => { setActionLock('none'); setMustRenewOperationKey(false); setActionError(null); setExecutiveAction({ type: 'transmittal', set, action, comment: '', operationKey: crypto.randomUUID() }); }}>{action === 'receive' ? 'Получить' : action === 'return' ? 'Вернуть' : 'Принять'}</button>)}
              </div>
            </article>
          );
        }) : <p className="empty-state">Передачи исполнительной документации пока отсутствуют.</p>}
      </section>

      {executiveAction ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card" onSubmit={(event) => { event.preventDefault(); void submitExecutiveAction(); }}>
            <h3>{executiveAction.type === 'remark' ? 'Замечание по версии документа' : `${executiveAction.action === 'receive' ? 'Получение' : executiveAction.action === 'return' ? 'Возврат' : 'Принятие'} передачи`}</h3>
            {actionError ? <div className="form-error" role="alert">{actionError}</div> : null}
            {actionLock === 'refresh' ? <button type="button" className="primary-button" onClick={() => { setExecutiveAction(null); setActionLock('none'); setRefreshKey((current) => current + 1); }}>Перечитать передачу</button> : null}
            {executiveAction.type === 'remark' ? <>
              <p>Версия {executiveAction.versionId}</p>
              <label>Важность<select disabled={isSubmittingAction || actionLock !== 'none'} value={executiveAction.severity} onChange={(event) => { setMustRenewOperationKey(false); setExecutiveAction((current) => current?.type === 'remark' ? { ...current, severity: event.target.value as Severity, operationKey: mustRenewOperationKey ? crypto.randomUUID() : current.operationKey } : current); }}><option value="minor">Низкая</option><option value="major">Средняя</option><option value="critical">Критическая</option></select></label>
              <label>Текст замечания<textarea disabled={isSubmittingAction || actionLock !== 'none'} required value={executiveAction.body} onChange={(event) => { setMustRenewOperationKey(false); setExecutiveAction((current) => current?.type === 'remark' ? { ...current, body: event.target.value, operationKey: mustRenewOperationKey ? crypto.randomUUID() : current.operationKey } : current); }} /></label>
            </> : <label>Комментарий{executiveAction.action === 'return' ? ' (обязательно)' : ''}<textarea disabled={isSubmittingAction || actionLock !== 'none'} required={executiveAction.action === 'return'} value={executiveAction.comment} onChange={(event) => { const nextKey = mustRenewOperationKey ? crypto.randomUUID() : executiveAction.operationKey; setMustRenewOperationKey(false); setExecutiveAction((current) => current?.type === 'transmittal' ? { ...current, comment: event.target.value, operationKey: nextKey } : current); }} /></label>}
            <div className="form-actions"><button type="button" className="secondary-button" disabled={isSubmittingAction || actionLock !== 'none'} onClick={() => setExecutiveAction(null)}>Отмена</button><button type="submit" className="primary-button" disabled={isSubmittingAction || actionLock === 'refresh'}>{isSubmittingAction ? 'Выполняется…' : actionLock === 'refresh' ? 'Требуется перечитать' : 'Повторить / выполнить'}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
