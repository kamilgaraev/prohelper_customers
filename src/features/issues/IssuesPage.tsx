import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
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
  const [searchParams] = useSearchParams();
  const { canAccess } = usePermissions();
  const canManage = canAccess({ permission: 'customer.issues.manage' });
  const { value: issues, error } = useAsyncValue(() => customerPortalService.getIssues(), []);
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
    if (!selectedIssue && issues?.length) {
      setSelectedIssue(issues[0]);
    }
  }, [issues, selectedIssue]);

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
      window.location.reload();
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
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Issues"
        title="Замечания и разногласия"
        description="Структурированный контур замечаний по проекту, договору, акту или документу. Здесь же хранится история комментариев и срок ответа."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Реестр замечаний</h3>
            <span>{issueOptions.length}</span>
          </div>
          <div className="list-stack">
            {issueOptions.length ? issueOptions.map((issue) => (
              <button key={issue.id} type="button" className="list-row" onClick={() => setSelectedIssue(issue)}>
                <div>
                  <strong>{issue.title}</strong>
                  <p>{issue.project?.name ?? issue.contract?.number ?? 'Контекст уточняется'}</p>
                </div>
                <StatusPill tone={issue.status === 'resolved' ? 'success' : issue.status === 'rejected' ? 'warning' : 'primary'}>
                  {issue.status_label}
                </StatusPill>
              </button>
            )) : <p className="empty-state">Замечаний пока нет.</p>}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Новое замечание</h3>
          </div>
          {canManage ? (
            <form className="profile-list" onSubmit={submitIssue}>
              {formState.project_id || formState.contract_id || formState.performance_act_id || formState.file_id ? (
                <div className="list-row">
                  <div>
                    <strong>Контекст замечания уже выбран</strong>
                    <p>Новое замечание будет связано с текущим объектом, из которого вы перешли.</p>
                  </div>
                </div>
              ) : null}
              <label><span>Заголовок</span><input value={formState.title} onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))} /></label>
              <label><span>Причина</span><input value={formState.issue_reason} onChange={(e) => setFormState((p) => ({ ...p, issue_reason: e.target.value }))} /></label>
              <label><span>Описание</span><textarea value={formState.body} onChange={(e) => setFormState((p) => ({ ...p, body: e.target.value }))} rows={4} /></label>
              <label><span>Срок ответа</span><input type="date" value={formState.due_date} onChange={(e) => setFormState((p) => ({ ...p, due_date: e.target.value }))} /></label>
              <label><span>Ссылки на вложения</span><textarea value={formState.attachments} onChange={(e) => setFormState((p) => ({ ...p, attachments: e.target.value }))} rows={3} /></label>
              <button type="submit" disabled={submitting}>Создать замечание</button>
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
            <StatusPill tone={selectedIssue.status === 'resolved' ? 'success' : selectedIssue.status === 'rejected' ? 'warning' : 'primary'}>
              {selectedIssue.status_label}
            </StatusPill>
          </div>
          <div className="profile-list">
            <div><span>Причина</span><strong>{selectedIssue.issue_reason}</strong></div>
            <div><span>Проект</span><strong>{selectedIssue.project?.name ?? 'Не указан'}</strong></div>
            <div><span>Договор</span><strong>{selectedIssue.contract?.number ?? 'Не указан'}</strong></div>
            <div><span>Акт</span><strong>{selectedIssue.approval?.number ?? 'Не указан'}</strong></div>
            <div><span>Документ</span><strong>{selectedIssue.document?.title ?? 'Не указан'}</strong></div>
            <div><span>Срок ответа</span><strong>{selectedIssue.due_date ?? 'Без срока'}</strong></div>
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
          {canManage ? (
            <>
              <form className="profile-list" onSubmit={submitComment}>
                <label><span>Комментарий</span><textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={3} /></label>
                <button type="submit" disabled={submitting}>Добавить комментарий</button>
              </form>
              <div className="row-actions">
                <button type="button" onClick={() => void resolveIssue('resolved')} disabled={submitting}>Отметить решенным</button>
                <button type="button" onClick={() => void resolveIssue('rejected')} disabled={submitting}>Отклонить</button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
