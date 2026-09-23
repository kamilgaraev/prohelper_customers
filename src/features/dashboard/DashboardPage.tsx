import { useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { AttentionFeedItem } from '@shared/types/dashboard';
import { StateView } from '@shared/ui';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${Number(value).toLocaleString('ru-RU')} ₽`;
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
          <StateView state="empty" description={emptyText} />
        )}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const [refresh, setRefresh] = useState(0);
  const { value: dashboard, isLoading, error } = useAsyncValue(() => customerPortalService.getDashboard(), [refresh]);

  if (isLoading) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Обзор" title="Требует внимания" description="Загружаем сводку по доступным проектам." />
        <StateView state="loading" title="Загружаем сводку" description="Собираем данные по доступным проектам." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Обзор" title="Не удалось загрузить сводку" description="Проверьте соединение и попробуйте ещё раз." />
        <StateView state="error" description="Проверьте соединение и попробуйте ещё раз." onRetry={() => setRefresh((value) => value + 1)} />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Обзор" title="Сводка пока недоступна" description="Вернитесь позже или откройте нужный раздел кабинета." />
        <StateView state="empty" description="Нет данных для отображения." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Обзор"
        title="Требует внимания"
        description="Рабочая сводка участника проекта: задачи, риски, финансы и последние изменения по доступным проектам."
      />

      <section className="metrics-grid">
        {dashboard.metrics.length ? dashboard.metrics.map((item) => (
          <article key={item.label} className="metric-tile">
            <StatusPill tone={item.tone}>{item.label}</StatusPill>
            <strong>{item.value}</strong>
          </article>
        )) : <StateView state="empty" description="Сводные показатели пока не сформированы." />}
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
              {dashboard.discipline_summary.issue_response_hours !== null && dashboard.discipline_summary.issue_response_hours !== undefined
                ? `${dashboard.discipline_summary.issue_response_hours} ч`
                : '—'}
            </strong>
          </div>
          <div>
            <span>Ответ по запросам</span>
            <strong>
              {dashboard.discipline_summary.request_response_hours !== null && dashboard.discipline_summary.request_response_hours !== undefined
                ? `${dashboard.discipline_summary.request_response_hours} ч`
                : '—'}
            </strong>
          </div>
          <div>
            <span>Просроченные действия</span>
            <strong>{dashboard.discipline_summary.overdue_actions_count ?? '—'}</strong>
          </div>
          <div>
            <span>Возвраты на доработку</span>
            <strong>{dashboard.discipline_summary.rework_count ?? '—'}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        {renderAttentionGroup(
          'Новые договоры',
          dashboard.attention_feed.contracts,
          'Новых договоров, требующих внимания, сейчас нет.',
          '/dashboard/contracts'
        )}
        {renderAttentionGroup(
          'Ожидают решения',
          dashboard.attention_feed.approvals,
          'Открытых актов на согласовании сейчас нет.',
          '/dashboard/approvals'
        )}
      </section>

      {canViewFinance && dashboard.finance_summary ? (
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
            {dashboard.project_risks.length ? (
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
              <StateView state="empty" description="Критичных рисков по доступным проектам сейчас нет." />
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Последние изменения</h3>
          </div>
          <div className="list-stack">
            {dashboard.recent_changes.length ? (
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
              <StateView state="empty" description="Новых изменений по проектам пока нет." />
            )}
          </div>
        </article>
      </section>

      <section className="dual-columns">
        {renderAttentionGroup(
          'Замечания',
          dashboard.attention_feed.issues,
          'Открытых замечаний сейчас нет.',
          '/dashboard/issues'
        )}
        {renderAttentionGroup(
          'Запросы заказчика',
          dashboard.attention_feed.requests,
          'Активных запросов сейчас нет.',
          '/dashboard/requests'
        )}
      </section>
    </div>
  );
}
