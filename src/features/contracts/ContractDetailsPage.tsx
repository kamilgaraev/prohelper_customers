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
        description="Карточка договора заказчика с проектом, контрагентом, сроками и финансовой сводкой."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone={getTone(contract?.status)}>
            {contract?.status_label ?? contract?.status ?? 'Подготовка данных'}
          </StatusPill>
          <h2>{contract?.subject ?? 'Предмет договора уточняется'}</h2>
          <p>
            {contract?.project?.name ?? 'Проект не указан'}
            {contract?.contractor?.name ? ` • ${contract.contractor.name}` : ''}
          </p>
          <p>
            <Link to={`/dashboard/contracts${backSearch}`}>Назад к списку договоров</Link>
            {contract?.project?.id ? ` • ` : ''}
            {contract?.project?.id ? (
              <Link to={`/dashboard/projects/${contract.project.id}`}>Открыть проект</Link>
            ) : null}
          </p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Сумма</small>
            <strong>
              {contract?.total_amount !== null && contract?.total_amount !== undefined
                ? `${contract.total_amount.toLocaleString('ru-RU')} ₽`
                : '—'}
            </strong>
          </div>
          <div>
            <small>Оплачено</small>
            <strong>{contract ? `${contract.paid_amount.toLocaleString('ru-RU')} ₽` : '—'}</strong>
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
              <span>Заказчик</span>
              <strong>{contract?.customer?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Источник заказчика</span>
              <strong>
                {contract?.customer?.is_fallback_owner
                  ? 'Владелец проекта (fallback)'
                  : contract?.customer?.source === 'project_participant'
                    ? 'Участник проекта'
                    : 'Не указан'}
              </strong>
            </div>
            <div>
              <span>Дата договора</span>
              <strong>{formatDate(contract?.date)}</strong>
            </div>
            <div>
              <span>Сроки</span>
              <strong>
                {contract?.start_date ? formatDate(contract.start_date) : '—'} / {contract?.end_date ? formatDate(contract.end_date) : 'Без срока'}
              </strong>
            </div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Контрагент и финансы</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Подрядчик</span>
              <strong>{contract?.contractor?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{contract ? `${contract.performed_amount.toLocaleString('ru-RU')} ₽` : '—'}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{contract ? `${contract.paid_amount.toLocaleString('ru-RU')} ₽` : '—'}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>
                {contract?.remaining_amount !== null && contract?.remaining_amount !== undefined
                  ? `${contract.remaining_amount.toLocaleString('ru-RU')} ₽`
                  : '—'}
              </strong>
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
