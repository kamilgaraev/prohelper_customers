// @vitest-environment jsdom
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FinancePage } from './FinancePage';
import { customerPortalService } from '@shared/api/customerPortalService';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getFinanceSummary: vi.fn(),
  },
}));

vi.mock('@shared/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ canAccess: () => true }),
}));

async function renderPage(): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<MemoryRouter><FinancePage /></MemoryRouter>);
    await Promise.resolve();
    await Promise.resolve();
  });

  return { container, root };
}

describe('FinancePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getFinanceSummary).mockResolvedValue({
      totals: {
        total_amount: 2000,
        performed_amount: 1500,
        invoiced_amount: 1200,
        paid_amount: 900,
        refunded_amount: 100,
        debt_amount: 400,
        overpayment_amount: 0,
        remaining_amount: 500,
        advance_amount: 50,
        retention_amount: 25,
      },
      projects: [],
    } as never);
  });

  it('shows invoiced, refunded and debt amounts as distinct ledger values', async () => {
    const { container, root } = await renderPage();

    expect(container.textContent).toContain('Выставлено');
    expect(container.textContent).toContain('Возвращено');
    expect(container.textContent).toContain('Задолженность');
    expect(container.textContent).toContain('1 200,00');
    expect(container.textContent).toContain('100,00');
    expect(container.textContent).toContain('400,00');

    root.unmount();
  });
});
