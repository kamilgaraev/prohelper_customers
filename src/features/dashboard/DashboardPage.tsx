import { motion } from 'framer-motion';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function DashboardPage() {
  const { value: metrics, isLoading: metricsLoading } = useAsyncValue(
    () => customerPortalService.getMetrics(),
    []
  );
  const { value: approvals } = useAsyncValue(() => customerPortalService.getApprovals(), []);
  const { value: conversations } = useAsyncValue(() => customerPortalService.getConversations(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Overview"
        title="Контур решений заказчика"
        description="Открытые вопросы, свежие документы и проектные коммуникации в одном рабочем экране."
      />

      <section className="poster-surface">
        <div className="poster-copy">
          <span className="section-eyebrow">Workspace</span>
          <h2>Единая точка контроля по проектам, согласованиям и деловой переписке.</h2>
          <p>
            Новый customer-портал отделён от внутренних модулей и показывает только то, что нужно
            заказчику для принятия решений.
          </p>
        </div>
        <div className="poster-orbit">
          <div />
          <div />
          <div />
        </div>
      </section>

      <section className="metrics-grid">
        {(metricsLoading ? new Array(4).fill(null) : metrics ?? []).map((item, index) => (
          <motion.article
            key={item ? item.label : index}
            className="metric-tile"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            {item ? (
              <>
                <StatusPill tone={item.tone}>{item.label}</StatusPill>
                <strong>{item.value}</strong>
              </>
            ) : (
              <div className="metric-placeholder" />
            )}
          </motion.article>
        ))}
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Ожидают согласования</h3>
            <span>{approvals?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {approvals?.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.projectName}</p>
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
            ))}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Коммуникации по объектам</h3>
            <span>{conversations?.length ?? 0}</span>
          </div>
          <div className="list-stack">
            {conversations?.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.lastMessage}</p>
                </div>
                <StatusPill tone={item.unreadCount > 0 ? 'warning' : 'neutral'}>
                  {item.unreadCount > 0 ? `Новых: ${item.unreadCount}` : 'Прочитано'}
                </StatusPill>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

