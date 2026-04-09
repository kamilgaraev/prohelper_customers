import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { AttentionFeedItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getPriorityTone(priority?: string): 'primary' | 'neutral' | 'success' | 'warning' {
  if (priority === 'critical' || priority === 'warning') {
    return 'warning';
  }

  if (priority === 'success') {
    return 'success';
  }

  return 'primary';
}

function resolveItemLink(item: AttentionFeedItem): string | null {
  const entity = item.related_entity;

  if (!entity) {
    return item.project ? `/dashboard/projects/${item.project.id}` : null;
  }

  switch (entity.type) {
    case 'contract':
      return `/dashboard/contracts/${entity.id}`;
    case 'approval':
      return item.project ? `/dashboard/projects/${item.project.id}` : '/dashboard/approvals';
    case 'issue':
      return `/dashboard/issues?selected=${entity.id}`;
    case 'request':
      return `/dashboard/requests?selected=${entity.id}`;
    default:
      return item.project ? `/dashboard/projects/${item.project.id}` : null;
  }
}

function renderAttentionGroup(
  title: string,
  items: AttentionFeedItem[],
  emptyText: string,
  fallbackLink: string
) {
  return (
    <article className="plain-panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <Link to={fallbackLink}>Открыть модуль</Link>
      </div>
      <div className="list-stack">
        {items.length ? (
          items.map((item) => {
            const link = resolveItemLink(item);

            return (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{link ? <Link to={link}>{item.title}</Link> : item.title}</strong>
                  <p>{item.subtitle ?? item.project?.name ?? 'Контекст уточняется'}</p>
                  <p>{item.project?.name ?? 'Без привязки к проекту'}</p>
                </div>
                <StatusPill tone={getPriorityTone(item.priority)}>{item.status}</StatusPill>
              </div>
            );
          })
        ) : (
          <p className="empty-state">{emptyText}</p>
        )}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const { value: dashboard, isLoading, error } = useAsyncValue(() => customerPortalService.getDashboard(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Overview"
        title="Требует внимания"
        description="Главный рабочий экран заказчика: очереди действий, риски, деньги и последние изменения по доступным проектам."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="metrics-grid">
        {(isLoading ? new Array(4).fill(null) : dashboard?.metrics ?? []).map((item, index) => (
          <article key={item ? item.label : index} className="metric-tile">
            {item ? (
              <>
                <StatusPill tone={item.tone}>{item.label}</StatusPill>
                <strong>{item.value}</strong>
              </>
            ) : (
              <div className="metric-placeholder" />
            )}
          </article>
        ))}
      </section>

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Исполнительская дисциплина</h3>
          <Link to="/dashboard/risks">Открыть центр контроля</Link>
        </div>
        <div className="profile-list">
          <div>
            <span>Ответ по замечаниям</span>
            <strong>
              {dashboard?.discipline_summary.issue_response_hours !== null && dashboard?.discipline_summary.issue_response_hours !== undefined
                ? `${dashboard.discipline_summary.issue_response_hours} ч`
                : '—'}
            </strong>
          </div>
          <div>
            <span>Ответ по запросам</span>
            <strong>
              {dashboard?.discipline_summary.request_response_hours !== null && dashboard?.discipline_summary.request_response_hours !== undefined
                ? `${dashboard.discipline_summary.request_response_hours} ч`
                : '—'}
            </strong>
          </div>
          <div>
            <span>Просроченные действия</span>
            <strong>{dashboard?.discipline_summary.overdue_actions_count ?? '—'}</strong>
          </div>
          <div>
            <span>Возвраты на доработку</span>
            <strong>{dashboard?.discipline_summary.rework_count ?? '—'}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        {renderAttentionGroup(
          'Новые договоры',
          dashboard?.attention_feed.contracts ?? [],
          'Новых договоров, требующих внимания, сейчас нет.',
          '/dashboard/contracts'
        )}
        {renderAttentionGroup(
          'Ожидают решения',
          dashboard?.attention_feed.approvals ?? [],
          'Открытых актов на согласовании сейчас нет.',
          '/dashboard/approvals'
        )}
      </section>

      {canViewFinance && dashboard?.finance_summary ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>Финансовая сводка</h3>
            <Link to="/dashboard/finance">Открыть финансы</Link>
          </div>
          <div className="profile-list">
            <div>
              <span>По договорам</span>
              <strong>{formatMoney(dashboard.finance_summary.totals.total_amount)}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{formatMoney(dashboard.finance_summary.totals.performed_amount)}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(dashboard.finance_summary.totals.paid_amount)}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>{formatMoney(dashboard.finance_summary.totals.remaining_amount)}</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Проектные риски</h3>
            <Link to="/dashboard/risks">Все риски</Link>
          </div>
          <div className="list-stack">
            {dashboard?.project_risks.length ? (
              dashboard.project_risks.map((risk) => (
                <div key={risk.project.id} className="list-row">
                  <div>
                    <strong>
                      <Link to={`/dashboard/projects/${risk.project.id}`}>{risk.project.name}</Link>
                    </strong>
                    <p>{risk.flags.join(' • ')}</p>
                    <p>
                      Актов без решения: {risk.pending_approvals} • Документов без реакции: {risk.documents_without_reaction}
                    </p>
                  </div>
                  <StatusPill tone="warning">Риск</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Критичных рисков по доступным проектам сейчас нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Последние изменения</h3>
          </div>
          <div className="list-stack">
            {dashboard?.recent_changes.length ? (
              dashboard.recent_changes.map((item) => (
                <div key={`${item.type}-${item.id}`} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle ?? 'Изменение в рабочем пространстве проекта'}</p>
                  </div>
                  <StatusPill tone="neutral">
                    {item.type === 'contract' ? 'Договор' : item.type === 'issue' ? 'Замечание' : 'Документ'}
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Новых изменений по проектам пока нет.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dual-columns">
        {renderAttentionGroup(
          'Замечания',
          dashboard?.attention_feed.issues ?? [],
          'Открытых замечаний сейчас нет.',
          '/dashboard/issues'
        )}
        {renderAttentionGroup(
          'Запросы заказчика',
          dashboard?.attention_feed.requests ?? [],
          'Активных запросов сейчас нет.',
          '/dashboard/requests'
        )}
      </section>
    </div>
  );
}
