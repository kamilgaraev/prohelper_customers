import { Link, Navigate, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate } from '@shared/utils/format';

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const { value: project, isLoading } = useAsyncValue(() => customerPortalService.getProject(projectId), [projectId]);
  const { value: documents } = useAsyncValue(() => customerPortalService.getProjectDocuments(projectId), [projectId]);
  const { value: approvals } = useAsyncValue(() => customerPortalService.getProjectApprovals(projectId), [projectId]);

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
        description="Карточка проекта показывает сроки, договоры заказчика, риски, документы и действия по объекту."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone="primary">{project?.phase ?? 'Подготовка данных'}</StatusPill>
          <h2>{project?.location ?? 'Адрес уточняется'}</h2>
          <p>{project?.description ?? project?.leadLabel ?? 'Собираем данные по проекту для заказчика.'}</p>
          <p>
            <Link to={`/dashboard/issues?project_id=${projectId}`}>Создать замечание</Link>
            {' • '}
            <Link to={`/dashboard/requests?project_id=${projectId}`}>Создать запрос</Link>
          </p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Готовность</small>
            <strong>{project ? `${project.completion}%` : '—'}</strong>
          </div>
          <div>
            <small>Бюджет</small>
            <strong>{project?.budgetLabel ?? '—'}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head"><h3>Паспорт проекта</h3></div>
          <div className="profile-list">
            <div><span>Статус</span><strong>{project?.status ?? 'Не указан'}</strong></div>
            <div><span>Ответственный</span><strong>{project?.leadLabel ?? 'Не указан'}</strong></div>
            <div><span>Заказчик проекта</span><strong>{project?.resolved_customer?.name ?? 'Не указан'}</strong></div>
            <div><span>Старт</span><strong>{formatDate(project?.startDate)}</strong></div>
            <div><span>Завершение</span><strong>{formatDate(project?.endDate)}</strong></div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head"><h3>Проблемные зоны</h3></div>
          {project?.problem_flags?.flags?.length ? (
            <div className="list-stack">
              {project.problem_flags.flags.map((flag) => (
                <div key={flag} className="list-row">
                  <strong>{flag}</strong>
                  <span>{project.problem_flags?.pending_approvals ?? 0} актов</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Критичных рисков по проекту сейчас нет.</p>
          )}
        </article>
      </section>

      {canViewFinance && project?.finance_summary ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>Финансы проекта</h3>
            <Link to="/dashboard/finance">Все финансы</Link>
          </div>
          <div className="profile-list">
            <div><span>По договорам</span><strong>{formatMoney(project.finance_summary.totals.total_amount)}</strong></div>
            <div><span>Выполнено</span><strong>{formatMoney(project.finance_summary.totals.performed_amount)}</strong></div>
            <div><span>Оплачено</span><strong>{formatMoney(project.finance_summary.totals.paid_amount)}</strong></div>
            <div><span>Остаток</span><strong>{formatMoney(project.finance_summary.totals.remaining_amount)}</strong></div>
          </div>
        </section>
      ) : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Ключевые договоры</h3>
            <Link to={`/dashboard/contracts?project_id=${projectId}`}>Все договоры проекта</Link>
          </div>
          <div className="list-stack">
            {project?.key_contracts?.length ? (
              project.key_contracts.map((contract) => (
                <div key={contract.id} className="list-row">
                  <div>
                    <strong><Link to={`/dashboard/contracts/${contract.id}?project_id=${projectId}`}>{contract.number}</Link></strong>
                    <p>{contract.subject ?? 'Предмет договора уточняется'}</p>
                  </div>
                  <StatusPill tone={contract.status === 'completed' ? 'success' : 'primary'}>
                    {formatMoney(contract.total_amount)}
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">По проекту пока нет договоров заказчика.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head"><h3>Документы и согласования</h3></div>
          <div className="list-stack">
            {documents?.slice(0, 3).map((item) => (
              <div key={`doc-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.uploadedAtLabel ?? 'Без даты'}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&file_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
            {approvals?.slice(0, 3).map((item) => (
              <div key={`approval-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.contractNumber ?? item.projectName}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&performance_act_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
