import { describe, expect, it } from 'vitest';

import { formatParties, formatRole, parseFilters } from './ContractsPage';

describe('ContractsPage helpers', () => {
  it('parses contractor search from query params', () => {
    const filters = parseFilters(new URLSearchParams('page=2&contractor_search=Строй&search=C-12'));

    expect(filters.page).toBe(2);
    expect(filters.contractor_search).toBe('Строй');
    expect(filters.search).toBe('C-12');
  });

  it('formats contract parties using explicit contract side payload', () => {
    const result = formatParties({
      id: 1,
      number: 'C-1',
      subject: 'Тестовый договор',
      status: 'active',
      project: null,
      contractor: null,
      date: null,
      start_date: null,
      end_date: null,
      total_amount: 10,
      performed_amount: 0,
      paid_amount: 0,
      remaining_amount: 10,
      is_self_execution: false,
      contract_category: null,
      customer: null,
      contract_side: {
        type: 'customer_to_general_contractor',
        display_label: 'Заказчик -> Генподрядчик',
        customer_organization: { id: 1, name: 'ООО Заказчик' },
        executor_organization: { id: 2, name: 'ООО Генподрядчик' },
      },
      current_organization_role: 'customer',
    });

    expect(result).toBe('ООО Заказчик • ООО Генподрядчик');
    expect(formatRole('customer')).toBe('Заказчик');
  });
});
