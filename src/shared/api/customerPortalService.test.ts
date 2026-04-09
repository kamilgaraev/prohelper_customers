import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGet } = vi.hoisted(() => ({
  mockedGet: vi.fn(),
}));

vi.mock('@shared/api/customerApi', () => ({
  customerApi: {
    get: mockedGet,
    post: vi.fn(),
  },
}));

import { customerPortalService } from '@shared/api/customerPortalService';

describe('customerPortalService contracts flow', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('sanitizes empty contract filters and unwraps paginated contracts payload', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 11,
              number: 'C-002',
              status: 'draft',
              subject: 'Тестовый договор',
              customer: {
                id: 9,
                name: 'ООО Заказчик',
              },
              contract_side: {
                type: 'customer_to_general_contractor',
                display_label: 'Заказчик -> Генподрядчик',
                customer_organization: {
                  id: 9,
                  name: 'ООО Заказчик',
                },
                executor_organization: {
                  id: 18,
                  name: 'ООО Генподрядчик',
                },
              },
              current_organization_role: 'customer',
            },
          ],
          meta: {
            current_page: 1,
            per_page: 5,
            total: 1,
            last_page: 1,
            filters: {
              search: 'C-002',
              project_id: 7,
            },
          },
        },
      },
    });

    const response = await customerPortalService.getContracts({
      page: 1,
      per_page: 5,
      project_id: 7,
      contractor_search: 'Заказ',
      search: 'C-002',
      status: '',
      contractor_id: undefined,
    });

    expect(mockedGet).toHaveBeenCalledWith('/contracts', {
      params: {
        page: 1,
        per_page: 5,
        project_id: 7,
        contractor_search: 'Заказ',
        search: 'C-002',
      },
    });
    expect(response.items).toHaveLength(1);
    expect(response.items[0].contract_side?.type).toBe('customer_to_general_contractor');
    expect(response.items[0].current_organization_role).toBe('customer');
    expect(response.meta.filters.project_id).toBe(7);
  });

  it('loads project-scoped contracts through the paginated endpoint', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 12,
              number: 'C-003',
              status: 'active',
              subject: 'Договор проекта',
            },
          ],
          meta: {
            current_page: 2,
            per_page: 10,
            total: 11,
            last_page: 2,
            filters: {
              page: 2,
              per_page: 10,
              status: 'active',
            },
          },
        },
      },
    });

    const response = await customerPortalService.getProjectContracts(42, {
      page: 2,
      per_page: 10,
      status: 'active',
    });

    expect(mockedGet).toHaveBeenCalledWith('/projects/42/contracts', {
      params: {
        page: 2,
        per_page: 10,
        status: 'active',
      },
    });
    expect(response.meta.current_page).toBe(2);
    expect(response.meta.total).toBe(11);
    expect(response.items[0].number).toBe('C-003');
  });
});
