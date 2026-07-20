import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
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
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });
  const contractId = Number(params.contractId);
  const backSearch = location.search || '';
  const { value: contract, isLoading } = useAsyncValue(() => customerPortalService.getContract(contractId), [contractId]);
  const { value: legalDocuments } = useAsyncValue(() => customerPortalService.getContractLegalDocuments(contractId), [contractId]);

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
        description="Карточка договора: стороны, проект, акты, оплаты, дополнительные соглашения и история изменений."
      />

      <section className="detail-hero">
        <div>
          <StatusPill tone={getTone(contract?.status)}>
            {contract?.status_label ?? contract?.status ?? 'Подготовка данных'}
          </StatusPill>
          <h2>{contract?.subject ?? 'Предмет договора уточняется'}</h2>
          <p>{contract?.contract_side?.display_label ?? 'Договор по проекту'}</p>
          <p>
            <Link to={`/dashboard/contracts${backSearch}`}>Назад к списку</Link>
            {contract?.project?.id ? ' • ' : ''}
            {contract?.project?.id ? <Link to={`/dashboard/projects/${contract.project.id}`}>Открыть проект</Link> : null}
            {' • '}
            <Link to={`/dashboard/issues?contract_id=${contractId}`}>Создать замечание</Link>
            {' • '}
            <Link to={`/dashboard/requests?contract_id=${contractId}`}>Создать запрос</Link>
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

      <section className="plain-panel">
        <div className="panel-head"><h3>Юридические документы</h3></div>
        {legalDocuments?.length ? legalDocuments.map((document) => (
            <div key={document.id} className="list-row">
            <div><strong>{document.title}</strong><p>{document.document_number ?? document.document_type}</p>{document.obligations?.map((obligation) => <p key={obligation.id}>{obligation.title} · {obligation.status}{obligation.due_at ? ` · до ${formatDate(obligation.due_at)}` : ''}</p>)}</div>
            {document.signature_requests?.filter((request) => request.method === 'paper').map((request) => <button key={request.id} type="button" className="text-button" onClick={() => void customerPortalService.registerLegalDocumentOriginal(request.id, { signed_at: new Date().toISOString(), storage_location: 'Оригинал у заказчика', lock_version: document.lock_version ?? 0 })}>Зарегистрировать оригинал</button>)}
            {document.current_version ? <button type="button" className="text-button" onClick={() => void customerPortalService.getLegalDocumentUrl(document.current_version!.id, 'preview').then((url) => window.open(url, '_blank', 'noopener,noreferrer'))}>Открыть</button> : null}
          </div>
        )) : <p className="empty-state">Юридические документы по договору пока не опубликованы.</p>}
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head"><h3>Паспорт договора</h3></div>
          <div className="profile-list">
            <div><span>Проект</span><strong>{contract?.project?.name ?? 'Не указан'}</strong></div>
            <div><span>Тип договора</span><strong>{contract?.contract_side?.display_label ?? 'Не указан'}</strong></div>
            <div><span>{contract?.contract_side?.first_party_role_label ?? 'Первая сторона'}</span><strong>{contract?.contract_side?.first_party?.name ?? contract?.contract_side?.customer_organization?.name ?? contract?.customer?.name ?? 'Не указан'}</strong></div>
            <div><span>{contract?.contract_side?.second_party_role_label ?? 'Вторая сторона'}</span><strong>{contract?.contract_side?.second_party?.name ?? contract?.contract_side?.executor_organization?.name ?? contract?.contractor?.name ?? 'Не указан'}</strong></div>
            <div><span>Ваша роль</span><strong>{getRoleLabel(contract?.current_organization_role)}</strong></div>
            <div><span>Дата договора</span><strong>{formatDate(contract?.date)}</strong></div>
            <div><span>Сроки</span><strong>{formatDate(contract?.start_date)} / {formatDate(contract?.end_date)}</strong></div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head"><h3>Финансы и исполнение</h3></div>
          {canViewFinance && contract?.financial_summary ? (
            <div className="profile-list">
              <div><span>По договору</span><strong>{formatMoney(contract.financial_summary.total_amount)}</strong></div>
              <div><span>Выполнено</span><strong>{formatMoney(contract.financial_summary.performed_amount)}</strong></div>
              <div><span>Оплачено</span><strong>{formatMoney(contract.financial_summary.paid_amount)}</strong></div>
              <div><span>Остаток</span><strong>{formatMoney(contract.financial_summary.remaining_amount)}</strong></div>
              <div><span>Аванс</span><strong>{formatMoney(contract.financial_summary.advance_amount)}</strong></div>
              <div><span>Удержание</span><strong>{formatMoney(contract.financial_summary.warranty_retention_amount)}</strong></div>
            </div>
          ) : (
            <p className="empty-state">Финансовая сводка доступна только ролям с правом просмотра денег.</p>
          )}
        </article>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head"><h3>Акты и оплаты</h3></div>
          <div className="list-stack">
            {contract?.acts_summary?.items.map((item) => (
              <div key={`act-${item.id}`} className="list-row">
                <div>
                  <strong>{item.number}</strong>
                  <p>{formatDate(item.date)}</p>
                </div>
                <StatusPill tone={item.status === 'approved' ? 'success' : 'warning'}>
                  {formatMoney(item.amount)}
                </StatusPill>
              </div>
            ))}
            {contract?.payments_summary?.items.map((item) => (
              <div key={`payment-${item.id}`} className="list-row">
                <div>
                  <strong>{item.reference ?? 'Платеж'}</strong>
                  <p>{formatDate(item.date)}</p>
                </div>
                <StatusPill tone="primary">{formatMoney(item.amount)}</StatusPill>
              </div>
            ))}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head"><h3>Изменения договора</h3></div>
          <div className="list-stack">
            {contract?.agreements_summary?.items.map((item) => (
              <div key={`agreement-${item.id}`} className="list-row">
                <div>
                  <strong>{item.number}</strong>
                  <p>{formatDate(item.date)}</p>
                </div>
                <StatusPill tone="neutral">{formatMoney(item.change_amount)}</StatusPill>
              </div>
            ))}
            {contract?.timeline?.map((item, index) => (
              <div key={`${item.type}-${index}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.type}</p>
                </div>
                <span>{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
