import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { CustomerIssueItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function parseAttachments(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url) => ({ label: url, url }));
}

export function IssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const { canAccess } = usePermissions();
  const canManage = canAccess({ permission: 'customer.issues.manage' });
  const filters = useMemo(
    () => ({
      project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
      status: searchParams.get('status') || undefined,
      issue_reason: searchParams.get('issue_reason') || undefined,
      due_state: searchParams.get('due_state') === 'overdue' ? ('overdue' as const) : undefined,
    }),
    [searchParams]
  );
  const { value: issues, error } = useAsyncValue(() => customerPortalService.getIssues(filters), [searchParams.toString(), reloadToken]);
  const [selectedIssue, setSelectedIssue] = useState<CustomerIssueItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [formState, setFormState] = useState({
    title: '',
    issue_reason: 'Комментарий по проекту',
    body: '',
    due_date: '',
    attachments: '',
    project_id: searchParams.get('project_id') || '',
    contract_id: searchParams.get('contract_id') || '',
    performance_act_id: searchParams.get('performance_act_id') || '',
    file_id: searchParams.get('file_id') || '',
  });

  useEffect(() => {
    if (!issues?.length) {
      setSelectedIssue(null);
      return;
    }

    const selectedId = Number(searchParams.get('selected'));

    if (selectedId) {
      const fromQuery = issues.find((issue) => issue.id === selectedId);
      if (fromQuery) {
        setSelectedIssue(fromQuery);
        return;
      }
    }

    if (!selectedIssue || !issues.some((issue) => issue.id === selectedIssue.id)) {
      setSelectedIssue(issues[0]);
    }
  }, [issues, searchParams, selectedIssue]);

  const issueOptions = useMemo(() => issues ?? [], [issues]);

  const submitIssue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const created = await customerPortalService.createIssue({
        title: formState.title,
        issue_reason: formState.issue_reason,
        body: formState.body,
        due_date: formState.due_date || undefined,
        project_id: formState.project_id ? Number(formState.project_id) : undefined,
        contract_id: formState.contract_id ? Number(formState.contract_id) : undefined,
        performance_act_id: formState.performance_act_id ? Number(formState.performance_act_id) : undefined,
        file_id: formState.file_id ? Number(formState.file_id) : undefined,
        attachments: parseAttachments(formState.attachments),
      });
      setSelectedIssue(created);
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

    if (!selectedIssue || !commentBody.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const updated = await customerPortalService.addIssueComment(selectedIssue.id, { body: commentBody });
      setSelectedIssue(updated);
      setCommentBody('');
      setReloadToken((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveIssue = async (status: 'resolved' | 'rejected') => {
    if (!selectedIssue) {
      return;
    }

    setSubmitting(true);

    try {
      const updated = await customerPortalService.resolveIssue(selectedIssue.id, status);
      setSelectedIssue(updated);
      setReloadToken((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Issues"
        title="Замечания и разногласия"
        description="Структурированный контур замечаний по проекту, договору, акту или документу со сроками ответа, историей и текущим статусом."
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
              <option value="in_progress">В работе</option>
              <option value="waiting_response">Ждут ответа</option>
              <option value="resolved">Решены</option>
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
            <h3>Реестр замечаний</h3>
            <span>{issueOptions.length}</span>
          </div>
          <div className="list-stack">
            {issueOptions.length ? (
              issueOptions.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className="list-row"
                  onClick={() => {
                    setSelectedIssue(issue);
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set('selected', String(issue.id));
                      return next;
                    });
                  }}
                >
                  <div>
                    <strong>{issue.title}</strong>
                    <p>{issue.project?.name ?? issue.contract?.number ?? 'Контекст уточняется'}</p>
                    <p>{issue.overdue_since ? `Просрочено с ${issue.overdue_since}` : issue.status_label}</p>
                  </div>
                  <StatusPill tone={issue.overdue_since ? 'warning' : issue.status === 'resolved' ? 'success' : 'primary'}>
                    {issue.status_label}
                  </StatusPill>
                </button>
              ))
            ) : (
              <p className="empty-state">Замечаний по выбранным условиям пока нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Новое замечание</h3>
          </div>
          {canManage ? (
            <form className="profile-list" onSubmit={submitIssue}>
              <label>
                <span>Заголовок</span>
                <input value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
              </label>
              <label>
                <span>Причина</span>
                <input
                  value={formState.issue_reason}
                  onChange={(event) => setFormState((prev) => ({ ...prev, issue_reason: event.target.value }))}
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
                Создать замечание
              </button>
            </form>
          ) : (
            <p className="empty-state">У вашей роли нет прав на создание замечаний.</p>
          )}
        </article>
      </section>

      {selectedIssue ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>{selectedIssue.title}</h3>
            <StatusPill tone={selectedIssue.overdue_since ? 'warning' : selectedIssue.status === 'resolved' ? 'success' : 'primary'}>
              {selectedIssue.status_label}
            </StatusPill>
          </div>
          <div className="profile-list">
            <div>
              <span>Причина</span>
              <strong>{selectedIssue.issue_reason}</strong>
            </div>
            <div>
              <span>Проект</span>
              <strong>{selectedIssue.project?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Договор</span>
              <strong>{selectedIssue.contract?.number ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Акт</span>
              <strong>{selectedIssue.approval?.number ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Документ</span>
              <strong>{selectedIssue.document?.title ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Срок ответа</span>
              <strong>{selectedIssue.due_date ?? 'Без срока'}</strong>
            </div>
            <div>
              <span>Последний ответ</span>
              <strong>
                {selectedIssue.last_response_at
                  ? new Date(selectedIssue.last_response_at).toLocaleString('ru-RU')
                  : 'Пока без ответа'}
              </strong>
            </div>
            <div>
              <span>Исполнитель</span>
              <strong>{selectedIssue.assignee?.name ?? 'Не назначен'}</strong>
            </div>
          </div>
          <p>{selectedIssue.body}</p>
          <div className="list-stack">
            {selectedIssue.comments.map((comment) => (
              <div key={comment.id} className="list-row">
                <div>
                  <strong>{comment.author?.name ?? 'Участник'}</strong>
                  <p>{comment.body}</p>
                </div>
                <span>{comment.created_at ? new Date(comment.created_at).toLocaleString('ru-RU') : ''}</span>
              </div>
            ))}
          </div>
          {selectedIssue.history?.length ? (
            <div className="list-stack">
              {selectedIssue.history.map((item, index) => (
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
                <button type="button" onClick={() => void resolveIssue('resolved')} disabled={submitting}>
                  Отметить решенным
                </button>
                <button type="button" onClick={() => void resolveIssue('rejected')} disabled={submitting}>
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
