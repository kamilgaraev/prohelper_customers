import { Link, Navigate, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { ProjectTimelineItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate } from '@shared/utils/format';

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getTimelineLink(item: ProjectTimelineItem): string | null {
  switch (item.related_entity?.type) {
    case 'contract':
      return `/dashboard/contracts/${item.related_entity.id}`;
    case 'issue':
      return `/dashboard/issues?selected=${item.related_entity.id}`;
    case 'request':
      return `/dashboard/requests?selected=${item.related_entity.id}`;
    default:
      return null;
  }
}

export function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const { value: workspace, isLoading, error } = useAsyncValue(
    () => customerPortalService.getProjectWorkspace(projectId),
    [projectId]
  );

  if (!Number.isFinite(projectId)) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  if (!isLoading && !workspace) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  const project = workspace?.project;
  const documents = workspace?.documents.items ?? [];
  const approvals = workspace?.approvals.items ?? [];
  const timeline = workspace?.timeline ?? [];
  const riskCenter = workspace?.risk_center;

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Project workspace"
        title={project?.name ?? 'Загрузка проекта'}
        description="Паспорт проекта, ключевые договоры, документы, согласования, риски и последние события на одном экране."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="detail-hero">
        <div>
          <StatusPill tone="primary">{project?.phase ?? 'Подготовка данных'}</StatusPill>
          <h2>{project?.location ?? 'Адрес уточняется'}</h2>
          <p>{project?.description ?? project?.leadLabel ?? 'Собираем данные по проекту для заказчика.'}</p>
          <p>
            <Link to={`/dashboard/issues?project_id=${projectId}`}>Создать замечание</Link>
            {' • '}
            <Link to={`/dashboard/requests?project_id=${projectId}`}>Создать запрос</Link>
            {' • '}
            <Link to={`/dashboard/contracts?project_id=${projectId}`}>Открыть договоры проекта</Link>
          </p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Готовность</small>
            <strong>{project ? `${project.completion}%` : '—'}</strong>
          </div>
          <div>
            <small>Документы</small>
            <strong>{workspace?.summary.documents_total ?? '—'}</strong>
          </div>
          <div>
            <small>Согласования</small>
            <strong>{workspace?.summary.approvals_total ?? '—'}</strong>
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
              <span>Заказчик проекта</span>
              <strong>{project?.resolved_customer?.name ?? 'Не указан'}</strong>
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
            <h3>Проблемные зоны</h3>
            <Link to="/dashboard/risks">Все риски</Link>
          </div>
          {riskCenter?.flags?.length ? (
            <div className="list-stack">
              {riskCenter.flags.map((flag) => (
                <div key={flag} className="list-row">
                  <div>
                    <strong>{flag}</strong>
                    <p>
                      Актов без решения: {riskCenter.pending_approvals} • Документов без реакции:{' '}
                      {riskCenter.documents_without_reaction}
                    </p>
                  </div>
                  <StatusPill tone="warning">Риск</StatusPill>
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
            <div>
              <span>По договорам</span>
              <strong>{formatMoney(project.finance_summary.totals.total_amount)}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{formatMoney(project.finance_summary.totals.performed_amount)}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(project.finance_summary.totals.paid_amount)}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>{formatMoney(project.finance_summary.totals.remaining_amount)}</strong>
            </div>
            <div>
              <span>Финансовое отклонение</span>
              <strong>{formatMoney(project.finance_summary.deviation.delta)}</strong>
            </div>
            <div>
              <span>Риск по оплате</span>
              <strong>{formatMoney(project.finance_summary.deviation.payment_delay_amount)}</strong>
            </div>
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
                    <strong>
                      <Link to={`/dashboard/contracts/${contract.id}?project_id=${projectId}`}>{contract.number}</Link>
                    </strong>
                    <p>{contract.subject ?? 'Предмет договора уточняется'}</p>
                  </div>
                  <StatusPill tone="primary">{formatMoney(contract.total_amount)}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">По проекту пока нет договоров заказчика.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Документы и согласования</h3>
          </div>
          <div className="list-stack">
            {documents.slice(0, 3).map((item) => (
              <div key={`doc-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.uploadedAtLabel ?? 'Без даты'}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&file_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
            {approvals.slice(0, 3).map((item) => (
              <div key={`approval-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.contractNumber ?? item.projectName}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&performance_act_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
            {!documents.length && !approvals.length ? (
              <p className="empty-state">По проекту пока нет документов и согласований.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Последние события</h3>
        </div>
        <div className="list-stack">
          {timeline.length ? (
            timeline.map((item) => {
              const link = getTimelineLink(item);

              return (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{link ? <Link to={link}>{item.title}</Link> : item.title}</strong>
                    <p>{item.subtitle ?? 'Событие по проекту'}</p>
                  </div>
                  <div className="row-actions">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : 'Без даты'}</span>
                    <StatusPill tone={item.priority === 'critical' || item.priority === 'warning' ? 'warning' : 'primary'}>
                      {item.status}
                    </StatusPill>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-state">Последних событий по проекту пока нет.</p>
          )}
        </div>
      </section>
    </div>
  );
}
