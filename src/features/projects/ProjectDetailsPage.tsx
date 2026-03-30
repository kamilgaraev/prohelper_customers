import { Navigate, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { value: project, isLoading } = useAsyncValue(
    () => customerPortalService.getProject(projectId),
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
        description="Карточка customer-проекта со статусом, бюджетом и точками входа в документы, решения и переписку."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone="primary">{project?.phase ?? 'Подготовка данных'}</StatusPill>
          <h2>{project?.location ?? 'Проверяем проектный контур'}</h2>
          <p>{project?.leadLabel ?? 'Собираем customer-safe проекцию данных по проекту.'}</p>
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
            <h3>Что будет в customer DTO</h3>
          </div>
          <ul className="simple-list">
            <li>Сводный статус и фаза проекта</li>
            <li>Документы и версии, доступные заказчику</li>
            <li>Очередь согласований и журнал решений</li>
            <li>Треды переписки по проекту и по документам</li>
          </ul>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Следующие backend точки</h3>
          </div>
          <ul className="simple-list">
            <li>GET /api/v1/customer/projects/:id</li>
            <li>GET /api/v1/customer/projects/:id/documents</li>
            <li>GET /api/v1/customer/projects/:id/conversations</li>
            <li>GET /api/v1/customer/projects/:id/approvals</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
