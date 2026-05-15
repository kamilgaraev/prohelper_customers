// @vitest-environment jsdom
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalsPage } from './ApprovalsPage';
import { customerPortalService } from '@shared/api/customerPortalService';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getApprovals: vi.fn(),
    getChangeApprovals: vi.fn(),
    approveChangeRequest: vi.fn(),
  },
}));

async function renderPage(): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <ApprovalsPage />
      </MemoryRouter>
    );
  });

  return { container, root };
}

describe('ApprovalsPage change management contour', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getApprovals).mockResolvedValue([]);
    vi.mocked(customerPortalService.getChangeApprovals).mockResolvedValue([
      {
        id: 5,
        project_id: 9,
        change_number: 'CHG-00001',
        title: 'Дополнительное армирование',
        status: 'customer_review',
        impact: {
          cost_delta: '125000.00',
          schedule_delta_days: 4,
          requires_customer_approval: true,
        },
        problem_flags: [{ code: 'schedule_impact', message: 'Влияет на график', severity: 'warning' }],
        customer_approval: null,
      },
    ] as any);
    vi.mocked(customerPortalService.approveChangeRequest).mockResolvedValue({
      id: 5,
      project_id: 9,
      change_number: 'CHG-00001',
      title: 'Дополнительное армирование',
      status: 'approved',
      customer_approval: { id: 7, status: 'approved', comment: 'Согласовано' },
      impact: null,
      problem_flags: [],
    } as any);
  });

  it('shows customer change requests and approves the selected change', async () => {
    const { container, root } = await renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Дополнительное армирование');
    expect(container.textContent).toContain('CHG-00001');
    expect(container.textContent).toContain('Влияет на график');

    const approveButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Согласовать изменение');

    expect(approveButton).toBeTruthy();

    await act(async () => {
      approveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.approveChangeRequest).toHaveBeenCalledWith(5, {
      comment: 'Согласовано из кабинета заказчика',
    });

    root.unmount();
  });
});
