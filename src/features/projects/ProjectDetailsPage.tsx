import { Link, Navigate, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate } from '@shared/utils/format';

export function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { value: project, isLoading } = useAsyncValue(
    () => customerPortalService.getProject(projectId),
    [projectId]
  );
  const { value: documents } = useAsyncValue(
    () => customerPortalService.getProjectDocuments(projectId),
    [projectId]
  );
  const { value: contracts } = useAsyncValue(
    () => customerPortalService.getProjectContracts(projectId),
    [projectId]
  );
  const { value: approvals } = useAsyncValue(
    () => customerPortalService.getProjectApprovals(projectId),
    [projectId]
  );
  const { value: conversations } = useAsyncValue(
    () => customerPortalService.getProjectConversations(projectId),
    [projectId]
  );

  if (!Number.isFinite(projectId)) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  if (!isLoading && !project) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Project details"
        title={project?.name ?? 'Загрузка проекта'}
        description="Карточка customer-проекта с реальными данными по срокам, договорам, документам и согласованиям."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone="primary">{project?.phase ?? 'Подготовка данных'}</StatusPill>
          <h2>{project?.location ?? 'Проверяем проектный контур'}</h2>
          <p>{project?.description ?? project?.leadLabel ?? 'Собираем customer-safe проекцию данных по проекту.'}</p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Бюджет</small>
            <strong>{project?.budgetLabel ?? '—'}</strong>
          </div>
          <div>
            <small>Готовность</small>
            <strong>{project ? `${project.completion}%` : '—'}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Паспорт проекта</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Статус</span>
              <strong>{project?.status ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Ответственный</span>
              <strong>{project?.leadLabel ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Старт</span>
              <strong>{formatDate(project?.startDate)}</strong>
            </div>
            <div>
              <span>Завершение</span>
              <strong>{formatDate(project?.endDate)}</strong>
            </div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Сводка по разделам</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Договоры</span>
              <strong>{contracts?.length ?? 0}</strong>
            </div>
            <div>
              <span>Документы</span>
              <strong>{documents?.length ?? 0}</strong>
            </div>
            <div>
              <span>Согласования</span>
              <strong>{approvals?.length ?? 0}</strong>
            </div>
            <div>
              <span>Коммуникации</span>
              <strong>{conversations?.length ?? 0}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Договоры по проекту</h3>
          </div>
          <div className="list-stack">
            {contracts?.length ? (
              contracts.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>
                      <Link to={`/dashboard/contracts/${item.id}`}>{item.number}</Link>
                    </strong>
                    <p>{item.subject ?? 'Предмет договора уточняется'}</p>
                  </div>
                  <StatusPill tone={item.status === 'completed' ? 'success' : 'primary'}>
                    {item.status_label ?? item.status}
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Договоров по проекту пока нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Документы проекта</h3>
          </div>
          <div className="list-stack">
            {documents?.length ? (
              documents.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.projectName ?? 'Без привязки к проекту'}</p>
                  </div>
                  <StatusPill tone="neutral">{item.uploadedAtLabel ?? 'Без даты'}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Документы по проекту пока не опубликованы.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Согласования проекта</h3>
          </div>
          <div className="list-stack">
            {approvals?.length ? (
              approvals.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.projectName}</p>
                    {item.contractId ? (
                      <p>
                        <Link to={`/dashboard/contracts/${item.contractId}`}>Открыть договор</Link>
                      </p>
                    ) : null}
                  </div>
                  <StatusPill
                    tone={
                      item.status === 'approved'
                        ? 'success'
                        : item.status === 'changes_requested'
                          ? 'warning'
                          : 'primary'
                    }
                  >
                    {item.deadlineLabel}
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Открытых согласований по проекту сейчас нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Коммуникации</h3>
          </div>
          <div className="list-stack">
            {conversations?.length ? (
              conversations.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.lastMessage}</p>
                  </div>
                  <StatusPill tone={item.unreadCount > 0 ? 'warning' : 'neutral'}>
                    {item.unreadCount > 0 ? `Новых: ${item.unreadCount}` : 'Прочитано'}
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Переписка по проекту пока не начата.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
