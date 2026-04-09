import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { CustomerContractsFilters } from '@shared/types/dashboard';
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

function parseFilters(searchParams: URLSearchParams): CustomerContractsFilters {
  return {
    page: Number(searchParams.get('page') ?? 1) || 1,
    per_page: Number(searchParams.get('per_page') ?? 10) || 10,
    project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
    contractor_id: searchParams.get('contractor_id') ? Number(searchParams.get('contractor_id')) : undefined,
    status: searchParams.get('status') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    search: searchParams.get('search') || undefined,
  };
}

export function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState<CustomerContractsFilters>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const { value: contractsResponse, error, isLoading } = useAsyncValue(
    () => customerPortalService.getContracts(filters),
    [searchParams.toString()]
  );
  const { value: projects } = useAsyncValue(() => customerPortalService.getProjects(), []);

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
        eyebrow="Contracts"
        title="Контракты заказчика"
        description="Read-only список договоров по доступным проектам с фильтрами, пагинацией и быстрыми переходами в карточки."
      />

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <form className="profile-list" onSubmit={handleSubmit}>
          <label>
            <span>Поиск</span>
            <input
              value={draftFilters.search ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Номер или предмет договора"
            />
          </label>
          <label>
            <span>Проект</span>
            <select
              value={draftFilters.project_id ?? ''}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  project_id: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            >
              <option value="">Все проекты</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
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
          </label>
          <label>
            <span>ID подрядчика</span>
            <input
              type="number"
              value={draftFilters.contractor_id ?? ''}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  contractor_id: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              placeholder="Например, 42"
            />
          </label>
          <label>
            <span>Дата от</span>
            <input
              type="date"
              value={draftFilters.date_from ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value || undefined }))}
            />
          </label>
          <label>
            <span>Дата до</span>
            <input
              type="date"
              value={draftFilters.date_to ?? ''}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value || undefined }))}
            />
          </label>
          <label>
            <span>На странице</span>
            <select
              value={draftFilters.per_page ?? 10}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, per_page: Number(event.target.value), page: 1 }))
              }
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
          <div>
            <span>&nbsp;</span>
            <button type="submit">Применить</button>
          </div>
        </form>
      </section>

      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {isLoading ? <p className="empty-state">Загружаем договоры...</p> : null}
        {!isLoading && contractsResponse?.items.length ? (
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
                  <p>
                    {contract.project?.name ?? 'Без проекта'}
                    {contract.contractor?.name ? ` • ${contract.contractor.name}` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <p className="conversation-preview">
                    {contract.total_amount !== null
                      ? `${contract.total_amount.toLocaleString('ru-RU')} ₽`
                      : 'Сумма уточняется'}
                  </p>
                  <StatusPill tone={getTone(contract.status)}>
                    {contract.status_label ?? contract.status}
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
                <button
                  type="button"
                  onClick={() => handlePageChange(contractsResponse.meta.current_page - 1)}
                  disabled={contractsResponse.meta.current_page <= 1}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(contractsResponse.meta.current_page + 1)}
                  disabled={contractsResponse.meta.current_page >= contractsResponse.meta.last_page}
                >
                  Далее
                </button>
              </div>
            </div>
          </>
        ) : null}
        {!isLoading && !contractsResponse?.items.length ? (
          <p className="empty-state">По выбранным фильтрам договоры не найдены.</p>
        ) : null}
      </section>
    </div>
  );
}
