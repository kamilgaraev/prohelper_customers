import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate } from '@shared/utils/format';

function getTone(status?: string | null) {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'active') {
    return 'primary';
  }

  return 'neutral';
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getRoleLabel(role?: string | null): string {
  if (role === 'customer') {
    return 'Заказчик';
  }

  if (role === 'initiator') {
    return 'Инициатор договора';
  }

  return 'Не указана';
}

export function ContractDetailsPage() {
  const params = useParams<{ contractId: string }>();
  const location = useLocation();
  const contractId = Number(params.contractId);
  const backSearch = location.search || '';
  const { value: contract, isLoading } = useAsyncValue(
    () => customerPortalService.getContract(contractId),
    [contractId]
  );

  if (!Number.isFinite(contractId)) {
    return <Navigate to="/dashboard/contracts" replace />;
  }

  if (!isLoading && !contract) {
    return <Navigate to="/dashboard/contracts" replace />;
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Contract details"
        title={contract?.number ?? 'Загрузка договора'}
        description="Карточка договора показывает стороны, проект, сроки и финансовую сводку по customer-side договору."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone={getTone(contract?.status)}>
            {contract?.status_label ?? contract?.status ?? 'Подготовка данных'}
          </StatusPill>
          <h2>{contract?.subject ?? 'Предмет договора уточняется'}</h2>
          <p>{contract?.contract_side?.display_label ?? 'Договор по проекту'}</p>
          <p>
            {contract?.project?.name ?? 'Проект не указан'}
            {contract?.contract_side?.executor_organization?.name
              ? ` • ${contract.contract_side.executor_organization.name}`
              : ''}
          </p>
          <p>
            <Link to={`/dashboard/contracts${backSearch}`}>Назад к списку договоров</Link>
            {contract?.project?.id ? ' • ' : ''}
            {contract?.project?.id ? (
              <Link to={`/dashboard/projects/${contract.project.id}`}>Открыть проект</Link>
            ) : null}
          </p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Сумма</small>
            <strong>{formatMoney(contract?.total_amount)}</strong>
          </div>
          <div>
            <small>Оплачено</small>
            <strong>{formatMoney(contract?.paid_amount)}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Паспорт договора</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Проект</span>
              <strong>{contract?.project?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Тип договора</span>
              <strong>{contract?.contract_side?.display_label ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Заказчик</span>
              <strong>{contract?.contract_side?.customer_organization?.name ?? contract?.customer?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Исполнитель</span>
              <strong>{contract?.contract_side?.executor_organization?.name ?? contract?.contractor?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Ваша роль</span>
              <strong>{getRoleLabel(contract?.current_organization_role)}</strong>
            </div>
            <div>
              <span>Дата договора</span>
              <strong>{formatDate(contract?.date)}</strong>
            </div>
            <div>
              <span>Сроки</span>
              <strong>
                {contract?.start_date ? formatDate(contract.start_date) : '—'} /{' '}
                {contract?.end_date ? formatDate(contract.end_date) : 'Без срока'}
              </strong>
            </div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Финансы и исполнение</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Исполнитель</span>
              <strong>{contract?.contractor?.name ?? contract?.contract_side?.executor_organization?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{formatMoney(contract?.performed_amount)}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(contract?.paid_amount)}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>{formatMoney(contract?.remaining_amount)}</strong>
            </div>
            <div>
              <span>Категория</span>
              <strong>{contract?.contract_category ?? 'Не указана'}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
