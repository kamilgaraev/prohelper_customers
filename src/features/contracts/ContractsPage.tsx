import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function ContractsPage() {
  const { value: contracts, error } = useAsyncValue(() => customerPortalService.getContracts(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Contracts"
        title="Контракты заказчика"
        description="Единая read-only лента договоров по доступным проектам с ключевыми суммами и статусами."
      />

      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {contracts?.length ? (
          contracts.map((contract) => (
            <article key={contract.id} className="list-row list-row--surface">
              <div>
                <strong>
                  <Link to={`/dashboard/contracts/${contract.id}`}>{contract.number}</Link>
                </strong>
                <p>{contract.subject ?? 'Предмет договора уточняется'}</p>
                <p>
                  {contract.project?.name ?? 'Без проекта'}
                  {contract.contractor?.name ? ` • ${contract.contractor.name}` : ''}
                </p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">
                  {contract.total_amount !== null ? `${contract.total_amount.toLocaleString('ru-RU')} ₽` : 'Сумма уточняется'}
                </p>
                <StatusPill tone={contract.status === 'active' ? 'primary' : contract.status === 'completed' ? 'success' : 'neutral'}>
                  {contract.status_label ?? contract.status}
                </StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">По доступным проектам договоры пока не найдены.</p>
        )}
      </section>
    </div>
  );
}
