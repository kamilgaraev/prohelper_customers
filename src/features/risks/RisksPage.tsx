import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function RisksPage() {
  const { value: dashboard, error, isLoading } = useAsyncValue(() => customerPortalService.getDashboard(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Risk center"
        title="Риски и контроль"
        description="Единый экран для просрочек, зависших документов, актов без решения и финансовых отклонений по доступным проектам."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Сводка по рискам</h3>
          <span>{dashboard?.project_risks.length ?? 0}</span>
        </div>
        <div className="profile-list">
          <div>
            <span>Просроченные действия</span>
            <strong>{dashboard?.discipline_summary.overdue_actions_count ?? '—'}</strong>
          </div>
          <div>
            <span>Возвраты на доработку</span>
            <strong>{dashboard?.discipline_summary.rework_count ?? '—'}</strong>
          </div>
          <div>
            <span>Зависшие объекты</span>
            <strong>{dashboard?.discipline_summary.stalled_items_count ?? '—'}</strong>
          </div>
          <div>
            <span>Средний цикл согласования</span>
            <strong>
              {dashboard?.discipline_summary.approval_cycle_hours !== undefined
                ? `${dashboard.discipline_summary.approval_cycle_hours} ч`
                : '—'}
            </strong>
          </div>
        </div>
      </section>

      <section className="list-surface">
        {isLoading ? <p className="empty-state">Собираем сигналы по проектам...</p> : null}
        {!isLoading && dashboard?.project_risks.length ? (
          dashboard.project_risks.map((risk) => (
            <article key={risk.project.id} className="list-row list-row--surface">
              <div>
                <strong>
                  <Link to={`/dashboard/projects/${risk.project.id}`}>{risk.project.name}</Link>
                </strong>
                <p>{risk.flags.join(' • ')}</p>
                <p>
                  Актов без решения: {risk.pending_approvals} • Документов без реакции: {risk.documents_without_reaction}
                </p>
              </div>
              <div className="row-actions">
                <StatusPill tone="warning">Требует внимания</StatusPill>
                <Link to={`/dashboard/issues?project_id=${risk.project.id}`}>Открыть замечания</Link>
              </div>
            </article>
          ))
        ) : null}
        {!isLoading && !dashboard?.project_risks.length ? (
          <p className="empty-state">Критичных рисков по доступным проектам сейчас нет.</p>
        ) : null}
      </section>
    </div>
  );
}
