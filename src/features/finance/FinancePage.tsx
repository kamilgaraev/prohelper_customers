import { useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { Panel, StateView } from '@shared/ui';
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
  const [refresh, setRefresh] = useState(0);
  const { value, error, isLoading } = useAsyncValue(
    () => (canViewFinance ? customerPortalService.getFinanceSummary() : Promise.resolve(null)),
    [canViewFinance, refresh]
  );

  if (!canViewFinance) {
    return (
      <div className="page-stack">
        <SectionHeading
          eyebrow="Финансы"
          title="Финансы"
          description="Финансовая сводка доступна только ролям с правом просмотра денег и отклонений."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Финансы" title="Финансы заказчика" description="Загружаем сводку по договорам и проектам." />
        <StateView state="loading" title="Загружаем финансовую сводку" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Финансы" title="Не удалось загрузить финансовую сводку" description="Проверьте соединение и попробуйте ещё раз." />
        <StateView state="error" description="Данные не обновились. Повторите загрузку." onRetry={() => setRefresh((value) => value + 1)} />
      </div>
    );
  }

  if (!value) {
    return (
      <div className="page-stack">
        <SectionHeading eyebrow="Финансы" title="Сводка пока недоступна" description="Вернитесь позже или обратитесь к администратору проекта." />
        <StateView state="empty" description="Финансовые данные пока не опубликованы." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Финансы"
        title="Финансы заказчика"
        description="Сводка по договорам: выполнение, выставленные счета, оплаты, возвраты и задолженность по всем проектам."
      />

      <Panel className="metrics-grid">
            <div className="metric-tile">
              <span>Сумма договоров</span>
              <strong>{formatMoney(value.totals.total_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Выполнено</span>
              <strong>{formatMoney(value.totals.performed_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Выставлено</span>
              <strong>{formatMoney(value.totals.invoiced_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Оплачено</span>
              <strong>{formatMoney(value.totals.paid_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Возвращено</span>
              <strong>{formatMoney(value.totals.refunded_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Задолженность</span>
              <strong>{formatMoney(value.totals.debt_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Переплата</span>
              <strong>{formatMoney(value.totals.overpayment_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Остаток</span>
              <strong>{formatMoney(value.totals.remaining_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Авансы</span>
              <strong>{formatMoney(value.totals.advance_amount)}</strong>
            </div>
            <div className="metric-tile">
              <span>Удержания</span>
              <strong>{formatMoney(value.totals.retention_amount)}</strong>
            </div>
      </Panel>

      <Panel className="list-surface">
            {value.projects.length ? value.projects.map((item) => (
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
            )) : <StateView state="empty" title="Нет проектов с финансовыми данными" description="Когда по доступным проектам появятся договоры, они отобразятся здесь." />}
      </Panel>
    </div>
  );
}
