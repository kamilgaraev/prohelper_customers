import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { CustomerRequestItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function parseAttachments(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url) => ({ label: url, url }));
}

export function RequestsPage() {
  const [searchParams] = useSearchParams();
  const { canAccess } = usePermissions();
  const canManage = canAccess({ permission: 'customer.requests.manage' });
  const { value: requests, error } = useAsyncValue(() => customerPortalService.getRequests(), []);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequestItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [formState, setFormState] = useState({
    title: '',
    request_type: 'Запрос документа',
    body: '',
    due_date: '',
    attachments: '',
    project_id: searchParams.get('project_id') || '',
    contract_id: searchParams.get('contract_id') || '',
  });

  useEffect(() => {
    if (!selectedRequest && requests?.length) {
      setSelectedRequest(requests[0]);
    }
  }, [requests, selectedRequest]);

  const requestOptions = useMemo(() => requests ?? [], [requests]);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const created = await customerPortalService.createRequest({
        title: formState.title,
        request_type: formState.request_type,
        body: formState.body,
        due_date: formState.due_date || undefined,
        project_id: formState.project_id ? Number(formState.project_id) : undefined,
        contract_id: formState.contract_id ? Number(formState.contract_id) : undefined,
        attachments: parseAttachments(formState.attachments),
      });
      setSelectedRequest(created);
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequest || !commentBody.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const updated = await customerPortalService.addRequestComment(selectedRequest.id, { body: commentBody });
      setSelectedRequest(updated);
      setCommentBody('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Requests"
        title="Запросы заказчика"
        description="Структурированные запросы вместо свободного чата: документы, пояснения, корректировки графика и условий договора."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Реестр запросов</h3>
            <span>{requestOptions.length}</span>
          </div>
          <div className="list-stack">
            {requestOptions.length ? requestOptions.map((item) => (
              <button key={item.id} type="button" className="list-row" onClick={() => setSelectedRequest(item)}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.project?.name ?? item.contract?.number ?? 'Контекст уточняется'}</p>
                </div>
                <StatusPill tone={item.status === 'resolved' ? 'success' : item.status === 'rejected' ? 'warning' : 'primary'}>
                  {item.status_label}
                </StatusPill>
              </button>
            )) : <p className="empty-state">Запросов пока нет.</p>}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Новый запрос</h3>
          </div>
          {canManage ? (
            <form className="profile-list" onSubmit={submitRequest}>
              {formState.project_id || formState.contract_id ? (
                <div className="list-row">
                  <div>
                    <strong>Контекст запроса уже выбран</strong>
                    <p>Новый запрос будет связан с текущим проектом или договором, из которого вы перешли.</p>
                  </div>
                </div>
              ) : null}
              <label><span>Заголовок</span><input value={formState.title} onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))} /></label>
              <label><span>Тип запроса</span><input value={formState.request_type} onChange={(e) => setFormState((p) => ({ ...p, request_type: e.target.value }))} /></label>
              <label><span>Описание</span><textarea value={formState.body} onChange={(e) => setFormState((p) => ({ ...p, body: e.target.value }))} rows={4} /></label>
              <label><span>Срок ответа</span><input type="date" value={formState.due_date} onChange={(e) => setFormState((p) => ({ ...p, due_date: e.target.value }))} /></label>
              <label><span>Ссылки на вложения</span><textarea value={formState.attachments} onChange={(e) => setFormState((p) => ({ ...p, attachments: e.target.value }))} rows={3} /></label>
              <button type="submit" disabled={submitting}>Создать запрос</button>
            </form>
          ) : (
            <p className="empty-state">У вашей роли нет прав на создание запросов.</p>
          )}
        </article>
      </section>

      {selectedRequest ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>{selectedRequest.title}</h3>
            <StatusPill tone={selectedRequest.status === 'resolved' ? 'success' : selectedRequest.status === 'rejected' ? 'warning' : 'primary'}>
              {selectedRequest.status_label}
            </StatusPill>
          </div>
          <div className="profile-list">
            <div><span>Тип</span><strong>{selectedRequest.request_type}</strong></div>
            <div><span>Проект</span><strong>{selectedRequest.project?.name ?? 'Не указан'}</strong></div>
            <div><span>Договор</span><strong>{selectedRequest.contract?.number ?? 'Не указан'}</strong></div>
            <div><span>Срок ответа</span><strong>{selectedRequest.due_date ?? 'Без срока'}</strong></div>
          </div>
          <p>{selectedRequest.body}</p>
          <div className="list-stack">
            {selectedRequest.comments.map((comment) => (
              <div key={comment.id} className="list-row">
                <div>
                  <strong>{comment.author?.name ?? 'Участник'}</strong>
                  <p>{comment.body}</p>
                </div>
                <span>{comment.created_at ? new Date(comment.created_at).toLocaleString('ru-RU') : ''}</span>
              </div>
            ))}
          </div>
          {canManage ? (
            <form className="profile-list" onSubmit={submitComment}>
              <label><span>Комментарий</span><textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={3} /></label>
              <button type="submit" disabled={submitting}>Добавить комментарий</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
