import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
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
        description="Главный рабочий экран заказчика: новые договоры, ожидающие согласования, проектные риски и последние изменения в одном месте."
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

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Новые договоры</h3>
            <Link to="/dashboard/contracts">Открыть реестр</Link>
          </div>
          <div className="list-stack">
            {dashboard?.attention_feed.contracts.length ? (
              dashboard.attention_feed.contracts.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>
                      <Link to={`/dashboard/contracts/${item.id}`}>{item.title}</Link>
                    </strong>
                    <p>{item.subtitle ?? 'Без проекта'}</p>
                  </div>
                  <StatusPill tone="primary">{item.status}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Новых договоров, требующих внимания, сейчас нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Ожидают решения</h3>
            <Link to="/dashboard/approvals">Все согласования</Link>
          </div>
          <div className="list-stack">
            {dashboard?.attention_feed.approvals.length ? (
              dashboard.attention_feed.approvals.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle ?? 'Проект уточняется'}</p>
                  </div>
                  <StatusPill tone="warning">{item.status}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Открытых актов на согласовании сейчас нет.</p>
            )}
          </div>
        </article>
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
            <Link to="/dashboard/projects">Все проекты</Link>
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
                  </div>
                  <StatusPill tone="warning">{`${risk.pending_approvals} актов`}</StatusPill>
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
                  <StatusPill tone="neutral">{item.type === 'contract' ? 'Договор' : 'Документ'}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Новых изменений по проектам пока нет.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Замечания</h3>
            <Link to="/dashboard/issues">Открыть модуль</Link>
          </div>
          <div className="list-stack">
            {dashboard?.attention_feed.issues.length ? (
              dashboard.attention_feed.issues.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <StatusPill tone="warning">{item.status}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Открытых замечаний сейчас нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Запросы заказчика</h3>
            <Link to="/dashboard/requests">Открыть модуль</Link>
          </div>
          <div className="list-stack">
            {dashboard?.attention_feed.requests.length ? (
              dashboard.attention_feed.requests.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <StatusPill tone="primary">{item.status}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">Активных запросов сейчас нет.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
