import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { SectionHeading } from '@shared/ui/SectionHeading';

function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
}

export function FinancePage() {
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const { value, error } = useAsyncValue(
    () => (canViewFinance ? customerPortalService.getFinanceSummary() : Promise.resolve(null)),
    [canViewFinance]
  );

  if (!canViewFinance) {
    return (
      <div className="page-stack">
        <SectionHeading
          eyebrow="Finance"
          title="Финансы"
          description="Финансовая сводка доступна только ролям с правом просмотра денег и отклонений."
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Finance"
        title="Финансы заказчика"
        description="Сводка по договорам: выполнение, выставленные счета, оплаты, возвраты и задолженность по всем проектам."
      />

      {error ? <div className="form-error">{error}</div> : null}

      {value ? (
        <>
          <section className="profile-list plain-panel">
            <div>
              <span>Сумма договоров</span>
              <strong>{formatMoney(value.totals.total_amount)}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{formatMoney(value.totals.performed_amount)}</strong>
            </div>
            <div>
              <span>Выставлено</span>
              <strong>{formatMoney(value.totals.invoiced_amount)}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(value.totals.paid_amount)}</strong>
            </div>
            <div>
              <span>Возвращено</span>
              <strong>{formatMoney(value.totals.refunded_amount)}</strong>
            </div>
            <div>
              <span>Задолженность</span>
              <strong>{formatMoney(value.totals.debt_amount)}</strong>
            </div>
            <div>
              <span>Переплата</span>
              <strong>{formatMoney(value.totals.overpayment_amount)}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>{formatMoney(value.totals.remaining_amount)}</strong>
            </div>
            <div>
              <span>Авансы</span>
              <strong>{formatMoney(value.totals.advance_amount)}</strong>
            </div>
            <div>
              <span>Удержания</span>
              <strong>{formatMoney(value.totals.retention_amount)}</strong>
            </div>
          </section>

          <section className="list-surface">
            {value.projects.map((item) => (
              <article key={item.project.id} className="list-row list-row--surface">
                <div>
                  <strong>
                    <Link to={`/dashboard/projects/${item.project.id}`}>{item.project.name}</Link>
                  </strong>
                  <p>По договорам: {formatMoney(item.totals.total_amount)}</p>
                  <p>Выставлено: {formatMoney(item.totals.invoiced_amount)} • Оплачено: {formatMoney(item.totals.paid_amount)}</p>
                  <p>Возвращено: {formatMoney(item.totals.refunded_amount)} • Задолженность: {formatMoney(item.totals.debt_amount)}</p>
                </div>
                <div className="row-actions">
                  <p className="conversation-preview">Отклонение: {formatMoney(item.deviation.delta)}</p>
                  <Link to={`/dashboard/contracts?project_id=${item.project.id}`}>Договоры проекта</Link>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
