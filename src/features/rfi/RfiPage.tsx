import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';

import { acceptedAttachmentInput, formatRfiFileSize, validateRfiAttachment } from './rfiAttachmentRules';
import { rfiService } from './rfiService';
import { rfiHasAction } from './rfiTypes';
import type { ProjectRfi, RfiAttachment, RfiDirection, RfiListResult, RfiRecipient } from './rfiTypes';
import './RfiPage.css';

const directions: Array<{ id: RfiDirection; label: string }> = [
  { id: 'incoming', label: 'Входящие' },
  { id: 'outgoing', label: 'Исходящие' },
  { id: 'drafts', label: 'Черновики' },
];

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  answered: 'Ответ получен',
  clarification_requested: 'Нужно уточнение',
  accepted: 'Ответ принят',
  closed: 'Закрыт',
};

const eventLabels: Record<string, string> = {
  created: 'Вопрос создан',
  sent: 'Вопрос отправлен',
  answered: 'Получен ответ',
  clarification_requested: 'Запрошено уточнение',
  accepted: 'Ответ принят',
  closed: 'Вопрос закрыт',
  recipient_reassigned: 'Изменён адресат',
  reassigned: 'Изменён адресат',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Срок не указан';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Срок не указан' : date.toLocaleDateString('ru-RU');
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? 'Статус обновлён';
}

function isOverdue(rfi: ProjectRfi): boolean {
  if (rfi.is_overdue !== undefined) return rfi.is_overdue;
  const dueDate = rfi.due_date ?? rfi.response_due_date;
  return Boolean(dueDate && new Date(dueDate).getTime() < Date.now() && !['accepted', 'closed'].includes(rfi.status));
}

function statusTone(rfi: ProjectRfi): string {
  if (isOverdue(rfi)) return 'status-pill--warning';
  if (rfi.status === 'accepted' || rfi.status === 'closed') return 'status-pill--success';
  if (rfi.status === 'draft') return 'status-pill--neutral';
  return 'status-pill--primary';
}

function available(rfi: ProjectRfi, action: string): boolean {
  return rfiHasAction(rfi.available_actions, action);
}

export function RfiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccess, isLoaded: permissionsLoaded } = usePermissions();
  const canView = canAccess({ permission: 'change-management.view' });
  const { value: projects, isLoading: projectsLoading, error: projectsError } = useAsyncValue(
    () => permissionsLoaded && canView ? customerPortalService.getProjects() : Promise.resolve([]),
    [permissionsLoaded, canView]
  );
  const projectIdValue = searchParams.get('project_id');
  const projectNumber = Number(projectIdValue);
  const projectId = projectIdValue && Number.isInteger(projectNumber) && projectNumber > 0 ? projectNumber : null;
  const requestedRfiValue = searchParams.get('id') ?? searchParams.get('rfi_id');
  const requestedRfiNumber = Number(requestedRfiValue);
  const selectedId = requestedRfiValue && Number.isInteger(requestedRfiNumber) && requestedRfiNumber > 0 ? requestedRfiNumber : null;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const updateSelectedRfiId = useCallback((id: number | null) => {
    const next = new URLSearchParams(searchParamsRef.current);
    next.delete('rfi_id');
    if (id) next.set('id', String(id));
    else next.delete('id');
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);
  const [direction, setDirection] = useState<RfiDirection>('incoming');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const listContextKey = `${projectId ?? ''}:${direction}`;
  const [items, setItems] = useState<ProjectRfi[]>([]);
  const [loadedListContextKey, setLoadedListContextKey] = useState<string | null>(null);
  const [pagination, setPagination] = useState<RfiListResult['pagination'] | null>(null);
  const [recipients, setRecipients] = useState<RfiRecipient[]>([]);
  const [detail, setDetail] = useState<ProjectRfi | null>(null);
  const [loadedDetailContextKey, setLoadedDetailContextKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [recipientId, setRecipientId] = useState('');
  const [answer, setAnswer] = useState('');
  const [clarification, setClarification] = useState('');
  const [draft, setDraft] = useState({ subject: '', question: '', due_date: '' });
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const detailContextKey = `${projectId ?? ''}:${selectedId ?? ''}`;
  const activeContext = useRef({ projectId, selectedId });
  activeContext.current = { projectId, selectedId };
  const activeListContext = useRef({ projectId, direction });
  activeListContext.current = { projectId, direction };
  const previousListContext = useRef({ projectId, direction });

  useEffect(() => {
    let active = true;
    const contextChanged = previousListContext.current.projectId !== projectId || previousListContext.current.direction !== direction;
    previousListContext.current = { projectId, direction };
    setLoading(true);
    setLoadedListContextKey(null);
    setLoadError(null);
    setItems([]);
    setPagination(null);
    setLoadMoreError(null);
    setRecipients([]);
    setRecipientId('');
    setAnswer('');
    setClarification('');
    if (contextChanged) {
      setNotice(null);
      setActionError(null);
      setAttachmentError(null);
    }

    if (!permissionsLoaded || !canView) {
      setLoading(false);
      return () => { active = false; };
    }

    if (!projectId) {
      setLoading(false);
      return () => { active = false; };
    }

    Promise.all([rfiService.list(projectId, direction), rfiService.recipients(projectId)])
      .then(([result, nextRecipients]) => {
        if (!active) return;
        setItems(result.items);
        setPagination(result.pagination);
        setRecipients(nextRecipients);
        if (!selectedIdRef.current && result.items[0]) updateSelectedRfiId(result.items[0].id);
        setLoadedListContextKey(listContextKey);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить вопросы проекта.');
          setLoadedListContextKey(listContextKey);
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId, direction, reloadToken, permissionsLoaded, canView, listContextKey, updateSelectedRfiId]);

  async function loadMore() {
    if (!projectId || !pagination || loadingMore || pagination.current_page >= pagination.last_page) return;
    const requestedProjectId = projectId;
    const requestedDirection = direction;
    const nextPage = pagination.current_page + 1;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await rfiService.list(requestedProjectId, requestedDirection, nextPage);
      if (activeListContext.current.projectId !== requestedProjectId || activeListContext.current.direction !== requestedDirection) return;
      setItems((current) => {
        const knownIds = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !knownIds.has(item.id))];
      });
      setPagination(result.pagination);
    } catch (error) {
      if (activeListContext.current.projectId === requestedProjectId && activeListContext.current.direction === requestedDirection) {
        setLoadMoreError(error instanceof Error ? error.message : 'Не удалось загрузить следующую страницу.');
      }
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let active = true;
    setDetail(null);
    setLoadedDetailContextKey(null);
    setActionError(null);
    if (!selectedId || !projectId || !permissionsLoaded || !canView) {
      setDetailLoading(false);
      return () => { active = false; };
    }
    setDetailLoading(true);
    rfiService.get(selectedId)
      .then((rfi) => {
        if (!active) return;
        if (rfi.project_id !== projectId) {
          setActionError('Вопрос не найден в выбранном проекте или недоступен.');
        } else {
          setDetail(rfi);
        }
        setLoadedDetailContextKey(detailContextKey);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setActionError(error instanceof Error ? error.message : 'Не удалось загрузить вопрос.');
        setLoadedDetailContextKey(detailContextKey);
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, projectId, reloadToken, detailContextKey, permissionsLoaded, canView]);

  const recipientOptions = useMemo(() => recipients, [recipients]);

  async function refresh(updated: ProjectRfi, message: string) {
    setDetail(updated);
    setNotice(message);
    setActionError(null);
    setReloadToken((value) => value + 1);
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || busy) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const created = await rfiService.create({
        project_id: projectId,
        subject: draft.subject.trim(),
        question: draft.question.trim(),
        due_date: draft.due_date || undefined,
        recipient_organization_id: recipientId ? Number(recipientId) : undefined,
      });
      setDraft({ subject: '', question: '', due_date: '' });
      setDirection('drafts');
      setIsCreatingDraft(false);
      updateSelectedRfiId(created.id);
      setDetail(created);
      setNotice('Черновик сохранён. Проверьте адресата и отправьте вопрос из карточки.');
      setReloadToken((value) => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось сохранить черновик.');
    } finally {
      setBusy(false);
    }
  }

  async function runAction(operation: () => Promise<ProjectRfi>, successMessage: string): Promise<boolean> {
    if (!detail || busy) return false;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await refresh(await operation(), successMessage);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось выполнить действие. Обновите карточку и попробуйте снова.');
      setReloadToken((value) => value + 1);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !detail || uploadingAttachment) return;
    const validationError = validateRfiAttachment(file);
    if (validationError) {
      setAttachmentError(validationError);
      return;
    }

    const uploadRfiId = detail.id;
    const uploadProjectId = projectId;
    setAttachmentError(null);
    setNotice(null);
    setUploadingAttachment(true);
    try {
      const updated = await rfiService.uploadAttachment(uploadRfiId, file);
      if (activeContext.current.projectId === uploadProjectId) {
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      if (activeContext.current.projectId === uploadProjectId && activeContext.current.selectedId === uploadRfiId) {
        setDetail(updated);
        setNotice('Вложение загружено.');
      }
    } catch (error) {
      if (activeContext.current.projectId === uploadProjectId && activeContext.current.selectedId === uploadRfiId) {
        setAttachmentError(error instanceof Error ? error.message : 'Не удалось загрузить вложение.');
        setReloadToken((value) => value + 1);
      }
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function downloadAttachment(attachment: RfiAttachment) {
    if (!detail || downloadingAttachmentId !== null) return;
    const downloadRfiId = detail.id;
    const downloadProjectId = projectId;
    const downloadWindow = window.open('about:blank', '_blank');
    if (!downloadWindow) {
      setAttachmentError('Разрешите открытие новой вкладки и повторите попытку.');
      return;
    }
    downloadWindow.opener = null;
    setAttachmentError(null);
    setDownloadingAttachmentId(attachment.id);
    try {
      const url = await rfiService.getAttachmentDownloadUrl(downloadRfiId, attachment.id);
      if (!url.startsWith('https://')) throw new Error('Ссылка на файл недействительна. Запросите её повторно.');
      if (activeContext.current.projectId !== downloadProjectId || activeContext.current.selectedId !== downloadRfiId) {
        downloadWindow.close();
        return;
      }
      downloadWindow.location.replace(url);
    } catch (error) {
      downloadWindow.close();
      if (activeContext.current.projectId === downloadProjectId && activeContext.current.selectedId === downloadRfiId) {
        setAttachmentError(error instanceof Error ? error.message : 'Не удалось открыть вложение.');
      }
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  function renderAttachments(attachments: RfiAttachment[] | undefined, keyPrefix: string) {
    if (!attachments?.length) return null;
    return (
      <ul className="rfi-attachments">
        {attachments.map((attachment) => (
          <li key={`${keyPrefix}-${attachment.id}`}>
            <span><strong>{attachment.name}</strong><small>{formatRfiFileSize(attachment.size)}</small></span>
            <button type="button" className="text-button" disabled={downloadingAttachmentId !== null} onClick={() => void downloadAttachment(attachment)}>
              {downloadingAttachmentId === attachment.id ? 'Получаем ссылку…' : 'Открыть файл'}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const sendAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || !answer.trim()) return;
    if (await runAction(() => rfiService.answer(detail.id, answer.trim()), 'Ответ отправлен.')) setAnswer('');
  };

  const askClarification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || !clarification.trim()) return;
    if (await runAction(() => rfiService.requestClarification(detail.id, clarification.trim()), 'Запрос уточнения отправлен.')) setClarification('');
  };

  return (
    <div className="page-stack rfi-page">
      <SectionHeading eyebrow="Проект" title="Вопросы по проекту" description="Рабочая переписка участников проекта по техническим и организационным вопросам." />

      {!loading && loadedListContextKey === listContextKey && loadError ? <div className="form-error" role="alert">{loadError}</div> : null}
      {notice ? <div className="form-success" role="status">{notice}</div> : null}
      {actionError ? <div className="form-error" role="alert">{actionError}</div> : null}

      {!projectId ? (
        permissionsLoaded && canView ? (
        <section className="plain-panel rfi-project-picker" aria-labelledby="rfi-project-heading">
          <div className="panel-head"><h2 id="rfi-project-heading">Выберите проект</h2></div>
          {projectsLoading ? <div className="screen-loader" role="status">Загружаем проекты…</div> : null}
          {projectsError ? <div className="form-error" role="alert">{projectsError}</div> : null}
          {!projectsLoading && !projectsError && projects?.length ? (
            <label><span>Проект</span><select defaultValue="" onChange={(event) => { const next = new URLSearchParams(searchParams); next.set('project_id', event.target.value); next.delete('id'); next.delete('rfi_id'); setSearchParams(next); }}><option value="" disabled>Выберите проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          ) : null}
          {!projectsLoading && !projectsError && !projects?.length ? <p className="empty-state">У вас пока нет доступных проектов.</p> : null}
        </section>
        ) : null
      ) : null}

      {!permissionsLoaded ? <div className="screen-loader" role="status">Проверяем доступ…</div> : null}
      {permissionsLoaded && !canView ? <div className="plain-panel" role="status">У вас нет доступа к вопросам проекта. Обратитесь к администратору проекта.</div> : null}

      {permissionsLoaded && canView && projectId && (loading || loadedListContextKey !== listContextKey) ? <div className="screen-loader" role="status" aria-live="polite">Загружаем вопросы проекта…</div> : null}

      {permissionsLoaded && canView && projectId && !loading && loadedListContextKey === listContextKey && !loadError ? (
        <>
          <nav className="rfi-tabs" aria-label="Разделы вопросов">
            {directions.map((tab) => (
              <button key={tab.id} type="button" className={direction === tab.id ? 'primary-button' : 'secondary-button'} aria-pressed={direction === tab.id} onClick={() => { setDirection(tab.id); setIsCreatingDraft(false); }}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="dual-columns rfi-layout">
            <section className="plain-panel" aria-labelledby="rfi-list-heading">
              <div className="panel-head"><h2 id="rfi-list-heading">{directions.find((tab) => tab.id === direction)?.label}</h2><div className="rfi-list-tools"><span>{pagination?.total ?? items.length}</span>{direction === 'drafts' ? <button type="button" className="secondary-button" onClick={() => { setIsCreatingDraft(true); updateSelectedRfiId(null); setActionError(null); }}>Новый вопрос</button> : null}</div></div>
              {items.length ? (
                <div className="list-stack rfi-list" aria-label="Список вопросов">
                  {items.map((item) => (
                    <button key={item.id} type="button" className={`list-row rfi-list-item${selectedId === item.id ? ' is-selected' : ''}`} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => { setIsCreatingDraft(false); updateSelectedRfiId(item.id); }}>
                      <span className="rfi-list-copy"><strong>{item.subject}</strong><span>{item.question}</span><small>{isOverdue(item) ? `Просрочен срок · ${formatDate(item.due_date ?? item.response_due_date)}` : `Срок · ${formatDate(item.due_date ?? item.response_due_date)}`}</small></span>
                      <span className={`status-pill ${statusTone(item)}`}>{isOverdue(item) ? 'Просрочен' : statusLabel(item.status)}</span>
                    </button>
                  ))}
                </div>
              ) : selectedId === null || !actionError ? (
                <p className="empty-state">{direction === 'drafts' ? 'Черновиков пока нет.' : 'Вопросов в этом разделе пока нет.'}</p>
              ) : null}
              {loadMoreError ? <div className="form-error" role="alert">{loadMoreError}</div> : null}
              {pagination && pagination.current_page < pagination.last_page ? <button type="button" className="secondary-button rfi-load-more" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Загружаем…' : 'Загрузить ещё'}</button> : null}
            </section>

            <section className="plain-panel rfi-detail" aria-label="Карточка вопроса" aria-live="polite">
              {direction === 'drafts' && isCreatingDraft ? (
                <form className="rfi-form" onSubmit={createDraft}>
                  <div className="panel-head"><h2>Новый вопрос</h2></div>
                  <label><span>Тема</span><input required maxLength={200} value={draft.subject} onChange={(event) => setDraft((value) => ({ ...value, subject: event.target.value }))} /></label>
                  <label><span>Вопрос</span><textarea required rows={5} value={draft.question} onChange={(event) => setDraft((value) => ({ ...value, question: event.target.value }))} /></label>
                  <label><span>Адресат</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">Выбрать позже</option>{recipientOptions.map((recipient) => <option key={recipient.organization_id} value={recipient.organization_id}>{recipient.name} · {recipient.relation === 'parent' ? 'вышестоящий участник' : 'непосредственный подчинённый'}</option>)}</select></label>
                  {!recipientOptions.length ? <p className="rfi-hint">Для отправки вопроса в проекте должна быть настроена иерархия участников.</p> : null}
                  <label><span>Срок ответа</span><input type="date" value={draft.due_date} onChange={(event) => setDraft((value) => ({ ...value, due_date: event.target.value }))} /></label>
                  <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить черновик'}</button>
                </form>
              ) : detailLoading || (selectedId !== null && loadedDetailContextKey !== detailContextKey) ? (
                <div className="screen-loader" role="status">Загружаем карточку вопроса…</div>
              ) : detail && loadedDetailContextKey === detailContextKey ? (
                <article>
                  <header className="rfi-detail-header">
                    <div><p className="rfi-eyebrow">Вопрос № {detail.id}{items.some((item) => item.id === detail.id) ? '' : ' · открыт по ссылке'}</p><h2>{detail.subject}</h2></div>
                    <span className={`status-pill ${statusTone(detail)}`}>{isOverdue(detail) ? 'Просрочен' : statusLabel(detail.status)}</span>
                  </header>
                  <dl className="rfi-meta"><div><dt>Срок ответа</dt><dd>{formatDate(detail.due_date ?? detail.response_due_date)}{isOverdue(detail) ? ' · просрочен' : ''}</dd></div><div><dt>Создан</dt><dd>{formatDate(detail.created_at)}</dd></div></dl>
                  <section className="rfi-message"><h3>Вопрос</h3><p>{detail.question}</p></section>
                  {detail.answer ? <section className="rfi-message"><h3>Ответ</h3><p>{detail.answer}</p></section> : null}
                  {detail.attachments?.length ? <section className="rfi-attachments-section"><h3>Вложения к вопросу</h3>{renderAttachments(detail.attachments, 'rfi')}</section> : null}
                  {attachmentError ? <div className="form-error" role="alert">{attachmentError}</div> : null}

                  <section className="rfi-history" aria-labelledby="rfi-history-heading"><h3 id="rfi-history-heading">История переписки</h3>
                    {detail.history?.length ? <ol>{detail.history.map((entry) => <li key={entry.id}><div className="rfi-history-top"><strong>{eventLabels[entry.event] ?? 'Обновление вопроса'}</strong><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('ru-RU')}</time></div>{entry.message ? <p>{entry.message}</p> : null}{renderAttachments(entry.attachments, `history-${entry.id}`)}</li>)}</ol> : <p className="rfi-hint">Записей пока нет.</p>}
                  </section>

                  <div className="rfi-actions">
                    {available(detail, 'upload_attachment') ? <label className="rfi-upload"><span>Добавить вложение</span><small>До 20 МБ. PDF, DOC, DOCX, XLS, XLSX, PNG, JPG.</small><input type="file" accept={acceptedAttachmentInput} disabled={uploadingAttachment} onChange={uploadAttachment} />{uploadingAttachment ? <span role="status">Загружаем файл…</span> : null}</label> : null}
                    {available(detail, 'send') ? <label><span>Кому отправить</span><select value={recipientId || String(detail.recipient_organization_id ?? '')} onChange={(event) => setRecipientId(event.target.value)}><option value="">Выберите участника</option>{recipientOptions.map((recipient) => <option key={recipient.organization_id} value={recipient.organization_id}>{recipient.name}</option>)}</select><button type="button" className="primary-button" disabled={busy || !recipientOptions.some((recipient) => recipient.organization_id === Number(recipientId || detail.recipient_organization_id))} onClick={() => void runAction(() => rfiService.send(detail.id, Number(recipientId || detail.recipient_organization_id)), 'Вопрос отправлен участнику проекта.')}>{busy ? 'Отправляем…' : 'Отправить вопрос'}</button>{!recipientOptions.some((recipient) => recipient.organization_id === Number(recipientId || detail.recipient_organization_id)) ? <span className="rfi-hint">{recipientOptions.length ? 'Адресат больше не является непосредственным участником проекта. Выберите актуального участника.' : 'Отправка появится после настройки иерархии участников проекта.'}</span> : null}</label> : null}
                    {available(detail, 'answer') ? <form className="rfi-form" onSubmit={sendAnswer}><label><span>Ответ</span><textarea required rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label><button type="submit" className="primary-button" disabled={busy || !answer.trim()}>{busy ? 'Отправляем…' : 'Отправить ответ'}</button></form> : null}
                    {available(detail, 'request_clarification') ? <form className="rfi-form" onSubmit={askClarification}><label><span>Что нужно уточнить</span><textarea required rows={3} value={clarification} onChange={(event) => setClarification(event.target.value)} /></label><button type="submit" className="secondary-button" disabled={busy || !clarification.trim()}>Запросить уточнение</button></form> : null}
                    {available(detail, 'accept') ? <button type="button" className="primary-button" disabled={busy} onClick={() => void runAction(() => rfiService.accept(detail.id), 'Ответ принят.')}>Принять ответ</button> : null}
                    {available(detail, 'close') ? <button type="button" className="secondary-button" disabled={busy} onClick={() => void runAction(() => rfiService.close(detail.id), 'Вопрос закрыт.')}>Закрыть вопрос</button> : null}
                  </div>
                </article>
              ) : !actionError ? (
                <p className="empty-state">Выберите вопрос из списка, чтобы открыть карточку.</p>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
