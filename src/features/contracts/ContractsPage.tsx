import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { CustomerContractsFilters, CustomerContractItem } from '@shared/types/dashboard';
import { Button, Field, Panel, StateView } from '@shared/ui';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function getTone(status: string) {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'active') {
    return 'primary';
  }

  return 'neutral';
}

function getStatusLabel(status: string, label?: string | null): string {
  if (label) return label;

  switch (status) {
    case 'draft': return 'Черновик';
    case 'active': return 'Действует';
    case 'completed': return 'Завершён';
    case 'on_hold': return 'Приостановлен';
    case 'terminated': return 'Расторгнут';
    default: return 'Статус уточняется';
  }
}

export function parseFilters(searchParams: URLSearchParams): CustomerContractsFilters {
  return {
    page: Number(searchParams.get('page') ?? 1) || 1,
    per_page: Number(searchParams.get('per_page') ?? 10) || 10,
    project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
    contractor_id: searchParams.get('contractor_id') ? Number(searchParams.get('contractor_id')) : undefined,
    contractor_search: searchParams.get('contractor_search') || undefined,
    status: searchParams.get('status') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    search: searchParams.get('search') || undefined,
  };
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

export function formatParties(contract: CustomerContractItem): string {
  const parties = [
    contract.contract_side?.first_party?.name ?? contract.contract_side?.customer_organization?.name ?? contract.customer?.name,
    contract.contract_side?.second_party?.name ?? contract.contract_side?.executor_organization?.name ?? contract.contractor?.name,
  ].filter(Boolean);

  return parties.length > 0 ? parties.join(' • ') : 'Стороны договора уточняются';
}

export function formatRole(role?: string | null): string {
  if (role === 'customer') {
    return 'Заказчик';
  }

  if (role === 'initiator') {
    return 'Инициатор договора';
  }

  return 'Роль уточняется';
}

export function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [refresh, setRefresh] = useState(0);
  const [draftFilters, setDraftFilters] = useState<CustomerContractsFilters>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const requestKey = `${searchParams.toString()}|${refresh}`;
  const [contractResult, setContractResult] = useState<{
    key: string;
    value: Awaited<ReturnType<typeof customerPortalService.getContracts>> | null;
    error: string | null;
    isLoading: boolean;
  }>({ key: '', value: null, error: null, isLoading: true });
  const projectsResult = useAsyncValue(() => customerPortalService.getProjects(), []);
  const contractsResponse = contractResult.key === requestKey ? contractResult.value : null;
  const error = contractResult.key === requestKey ? contractResult.error : null;
  const isLoading = contractResult.key !== requestKey || contractResult.isLoading;

  useEffect(() => {
    let cancelled = false;
    setContractResult({ key: requestKey, value: null, error: null, isLoading: true });

    void customerPortalService.getContracts(filters).then((value) => {
      if (!cancelled) {
        setContractResult({ key: requestKey, value, error: null, isLoading: false });
      }
    }).catch(() => {
      if (!cancelled) {
        setContractResult({ key: requestKey, value: null, error: 'Не удалось загрузить договоры. Проверьте соединение и повторите попытку.', isLoading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filters, requestKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    const nextFilters = { ...draftFilters, page: 1 };

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  };

  const handlePageChange = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(page));
    setSearchParams(nextParams);
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Договоры"
        title="Договоры заказчика"
        description="Показываем только те договоры, где ваша организация участвует как заказчик. Здесь можно отфильтровать список и открыть карточку договора."
      />

      <Panel className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <form className="form-grid form-grid--two" onSubmit={handleSubmit}>
          <Field label="Поиск" htmlFor="contracts-search">
            <input
              id="contracts-search"
              value={draftFilters.search ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Номер или предмет договора"
            />
          </Field>
          <Field label="Проект" htmlFor="contracts-project">
            <select
              id="contracts-project"
              value={draftFilters.project_id ?? ''}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  project_id: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            >
              <option value="">Все проекты</option>
              {projectsResult.value?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Статус" htmlFor="contracts-status">
            <select
              id="contracts-status"
              value={draftFilters.status ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value || undefined }))}
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="completed">Завершен</option>
              <option value="on_hold">На паузе</option>
              <option value="terminated">Расторгнут</option>
            </select>
          </Field>
          <Field label="Исполнитель" htmlFor="contracts-contractor">
            <input
              id="contracts-contractor"
              value={draftFilters.contractor_search ?? ''}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  contractor_search: event.target.value || undefined,
                }))
              }
              placeholder="Название исполнителя"
            />
          </Field>
          <Field label="Дата от" htmlFor="contracts-date-from">
            <input
              id="contracts-date-from"
              type="date"
              value={draftFilters.date_from ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value || undefined }))}
            />
          </Field>
          <Field label="Дата до" htmlFor="contracts-date-to">
            <input
              id="contracts-date-to"
              type="date"
              value={draftFilters.date_to ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value || undefined }))}
            />
          </Field>
          <Field label="На странице" htmlFor="contracts-per-page">
            <select
              id="contracts-per-page"
              value={draftFilters.per_page ?? 10}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, per_page: Number(event.target.value), page: 1 }))
              }
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </Field>
          <div>
            <span>&nbsp;</span>
            <Button variant="primary" type="submit">Применить фильтры</Button>
          </div>
        </form>
      </Panel>

      <Panel className="list-surface" aria-live="polite">
        {isLoading ? <StateView state="loading" title="Загружаем договоры" /> : null}
        {!isLoading && error ? <StateView state="error" description={error} onRetry={() => setRefresh((value) => value + 1)} /> : null}
        {!isLoading && !error && contractsResponse?.items.length ? (
          <>
            {contractsResponse.items.map((contract) => (
              <article key={contract.id} className="list-row list-row--surface">
                <div>
                  <strong>
                    <Link to={`/dashboard/contracts/${contract.id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>
                      {contract.number}
                    </Link>
                  </strong>
                  <p>{contract.subject ?? 'Предмет договора уточняется'}</p>
                  <p>{contract.contract_side?.display_label ?? 'Договор по проекту'}</p>
                  <p>{formatParties(contract)}</p>
                  <p>Ваша роль: {formatRole(contract.current_organization_role)}</p>
                  <p>{contract.project?.name ?? 'Без проекта'}</p>
                </div>
                <div className="row-actions">
                  <p className="conversation-preview">{formatMoney(contract.total_amount)}</p>
                  <StatusPill tone={getTone(contract.status)}>
                    {getStatusLabel(contract.status, contract.status_label)}
                  </StatusPill>
                </div>
              </article>
            ))}

            <div className="list-row">
              <div>
                <strong>
                  Страница {contractsResponse.meta.current_page} из {contractsResponse.meta.last_page}
                </strong>
                <p>Всего договоров: {contractsResponse.meta.total}</p>
              </div>
              <div className="row-actions">
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(contractsResponse.meta.current_page - 1)}
                  disabled={contractsResponse.meta.current_page <= 1}
                >
                  Назад
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(contractsResponse.meta.current_page + 1)}
                  disabled={contractsResponse.meta.current_page >= contractsResponse.meta.last_page}
                >
                  Далее
                </Button>
              </div>
            </div>
          </>
        ) : null}
        {!isLoading && !error && contractsResponse && !contractsResponse.items.length ? (
          <StateView state="empty" title="Договоры не найдены" description="Измените фильтры или очистите часть параметров поиска." />
        ) : null}
      </Panel>
    </div>
  );
}
