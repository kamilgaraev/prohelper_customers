import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const { canAccess } = usePermissions();
  const canManage = canAccess({ permission: 'customer.requests.manage' });
  const filters = useMemo(
    () => ({
      project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
      status: searchParams.get('status') || undefined,
      request_type: searchParams.get('request_type') || undefined,
      due_state: searchParams.get('due_state') === 'overdue' ? ('overdue' as const) : undefined,
    }),
    [searchParams]
  );
  const { value: requests, error } = useAsyncValue(
    () => customerPortalService.getRequests(filters),
    [searchParams.toString(), reloadToken]
  );
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
    if (!requests?.length) {
      setSelectedRequest(null);
      return;
    }

    const selectedId = Number(searchParams.get('selected'));

    if (selectedId) {
      const fromQuery = requests.find((request) => request.id === selectedId);
      if (fromQuery) {
        setSelectedRequest(fromQuery);
        return;
      }
    }

    if (!selectedRequest || !requests.some((request) => request.id === selectedRequest.id)) {
      setSelectedRequest(requests[0]);
    }
  }, [requests, searchParams, selectedRequest]);

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
      setReloadToken((value) => value + 1);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('selected', String(created.id));
        return next;
      });
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
      setReloadToken((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (
    status: 'accepted' | 'in_progress' | 'waiting_customer' | 'completed' | 'rejected'
  ) => {
    if (!selectedRequest) {
      return;
    }

    setSubmitting(true);

    try {
      const updated = await customerPortalService.resolveRequest(selectedRequest.id, status);
      setSelectedRequest(updated);
      setReloadToken((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Requests"
        title="Запросы заказчика"
        description="Структурированные запросы вместо свободного чата: документы, пояснения, корректировки графика и условий."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <div className="profile-list">
          <label>
            <span>Статус</span>
            <select
              value={filters.status ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) {
                  next.set('status', event.target.value);
                } else {
                  next.delete('status');
                }
                setSearchParams(next);
              }}
            >
              <option value="">Все</option>
              <option value="new">Новые</option>
              <option value="accepted">Приняты</option>
              <option value="in_progress">В работе</option>
              <option value="waiting_customer">Ждут решения заказчика</option>
              <option value="completed">Завершены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </label>
          <label>
            <span>Просрочка</span>
            <input
              type="checkbox"
              checked={filters.due_state === 'overdue'}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.checked) {
                  next.set('due_state', 'overdue');
                } else {
                  next.delete('due_state');
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
            <h3>Реестр запросов</h3>
            <span>{requestOptions.length}</span>
          </div>
          <div className="list-stack">
            {requestOptions.length ? (
              requestOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="list-row"
                  onClick={() => {
                    setSelectedRequest(item);
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set('selected', String(item.id));
                      return next;
                    });
                  }}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.project?.name ?? item.contract?.number ?? 'Контекст уточняется'}</p>
                    <p>{item.overdue_since ? `Просрочено с ${item.overdue_since}` : item.status_label}</p>
                  </div>
                  <StatusPill tone={item.overdue_since ? 'warning' : item.status === 'completed' ? 'success' : 'primary'}>
                    {item.status_label}
                  </StatusPill>
                </button>
              ))
            ) : (
              <p className="empty-state">Запросов по выбранным условиям пока нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Новый запрос</h3>
          </div>
          {canManage ? (
            <form className="profile-list" onSubmit={submitRequest}>
              <label>
                <span>Заголовок</span>
                <input value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
              </label>
              <label>
                <span>Тип запроса</span>
                <input
                  value={formState.request_type}
                  onChange={(event) => setFormState((prev) => ({ ...prev, request_type: event.target.value }))}
                />
              </label>
              <label>
                <span>Описание</span>
                <textarea value={formState.body} onChange={(event) => setFormState((prev) => ({ ...prev, body: event.target.value }))} rows={4} />
              </label>
              <label>
                <span>Срок ответа</span>
                <input type="date" value={formState.due_date} onChange={(event) => setFormState((prev) => ({ ...prev, due_date: event.target.value }))} />
              </label>
              <label>
                <span>Ссылки на вложения</span>
                <textarea
                  value={formState.attachments}
                  onChange={(event) => setFormState((prev) => ({ ...prev, attachments: event.target.value }))}
                  rows={3}
                />
              </label>
              <button type="submit" disabled={submitting}>
                Создать запрос
              </button>
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
            <StatusPill tone={selectedRequest.overdue_since ? 'warning' : selectedRequest.status === 'completed' ? 'success' : 'primary'}>
              {selectedRequest.status_label}
            </StatusPill>
          </div>
          <div className="profile-list">
            <div>
              <span>Тип</span>
              <strong>{selectedRequest.request_type}</strong>
            </div>
            <div>
              <span>Проект</span>
              <strong>{selectedRequest.project?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Договор</span>
              <strong>{selectedRequest.contract?.number ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Срок ответа</span>
              <strong>{selectedRequest.due_date ?? 'Без срока'}</strong>
            </div>
            <div>
              <span>Последний ответ</span>
              <strong>
                {selectedRequest.last_response_at
                  ? new Date(selectedRequest.last_response_at).toLocaleString('ru-RU')
                  : 'Пока без ответа'}
              </strong>
            </div>
            <div>
              <span>Исполнитель</span>
              <strong>{selectedRequest.assignee?.name ?? 'Не назначен'}</strong>
            </div>
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
          {selectedRequest.history?.length ? (
            <div className="list-stack">
              {selectedRequest.history.map((item, index) => (
                <div key={`${item.type}-${item.created_at}-${index}`} className="list-row">
                  <div>
                    <strong>{item.author_name ?? 'Система'}</strong>
                    <p>{item.status ?? item.body ?? item.type}</p>
                  </div>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : ''}</span>
                </div>
              ))}
            </div>
          ) : null}
          {canManage ? (
            <>
              <form className="profile-list" onSubmit={submitComment}>
                <label>
                  <span>Комментарий</span>
                  <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={3} />
                </label>
                <button type="submit" disabled={submitting}>
                  Добавить комментарий
                </button>
              </form>
              <div className="row-actions">
                <button type="button" onClick={() => void updateStatus('accepted')} disabled={submitting}>
                  Принять
                </button>
                <button type="button" onClick={() => void updateStatus('in_progress')} disabled={submitting}>
                  В работу
                </button>
                <button type="button" onClick={() => void updateStatus('waiting_customer')} disabled={submitting}>
                  Ждет решения заказчика
                </button>
                <button type="button" onClick={() => void updateStatus('completed')} disabled={submitting}>
                  Завершить
                </button>
                <button type="button" onClick={() => void updateStatus('rejected')} disabled={submitting}>
                  Отклонить
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
