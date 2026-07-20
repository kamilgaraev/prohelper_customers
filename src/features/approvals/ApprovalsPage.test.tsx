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
    getLegalDocuments: vi.fn(),
    decideLegalDocumentStep: vi.fn(),
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
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([]);
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

  it('uses backend-provided legal workflow actions with their concurrency versions', async () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'decision-key') });
    vi.mocked(customerPortalService.getChangeApprovals).mockResolvedValue([]);
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([
      {
        id: 25,
        title: 'Legal contract',
        document_number: 'LC-25',
        document_type: 'contract',
        status: 'in_review',
        lock_version: 4,
        document_date: null,
        effective_until: null,
        project: null,
        current_version: null,
        versions: [],
        workflow_summary: {
          available_action_details: [
            { action: 'approve', enabled: true, target_step_id: 101, expected_instance_lock_version: 4, expected_step_lock_version: 2 },
            { action: 'reject', enabled: true, target_step_id: 102, expected_instance_lock_version: 4, expected_step_lock_version: 3, requires_comment: true },
            { action: 'return', enabled: true, target_step_id: 103, expected_instance_lock_version: 4, expected_step_lock_version: 4 },
            { action: 'approve', enabled: false, target_step_id: 104, expected_instance_lock_version: 4, expected_step_lock_version: 5 },
          ],
        },
      },
    ]);
    vi.mocked(customerPortalService.decideLegalDocumentStep).mockResolvedValue(undefined);

    const { container, root } = await renderPage();
    await act(async () => { await Promise.resolve(); });
    const buttons = Array.from(container.querySelectorAll('button.button--primary'));

    expect(buttons).toHaveLength(3);

    await act(async () => {
      buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      buttons[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenNthCalledWith(1, 101, 'approve', {
      instance_lock_version: 4,
      step_lock_version: 2,
      comment: undefined,
      idempotency_key: 'decision-key',
    });
    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenNthCalledWith(2, 102, 'reject', {
      instance_lock_version: 4,
      step_lock_version: 3,
      comment: 'Решение направлено из кабинета заказчика',
      idempotency_key: 'decision-key',
    });
    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenNthCalledWith(3, 103, 'return', {
      instance_lock_version: 4,
      step_lock_version: 4,
      comment: undefined,
      idempotency_key: 'decision-key',
    });

    root.unmount();
  });

  it('reuses the same idempotency key when a legal decision is retried after an error', async () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'retry-key') });
    vi.mocked(customerPortalService.getChangeApprovals).mockResolvedValue([]);
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([
      {
        id: 26,
        title: 'Retry contract',
        document_number: null,
        document_type: 'contract',
        status: 'in_review',
        lock_version: 8,
        document_date: null,
        effective_until: null,
        project: null,
        current_version: null,
        versions: [],
        workflow_summary: {
          available_action_details: [
            { action: 'approve', enabled: true, target_step_id: 201, expected_instance_lock_version: 8, expected_step_lock_version: 6 },
          ],
        },
      },
    ]);
    vi.mocked(customerPortalService.decideLegalDocumentStep)
      .mockRejectedValueOnce(new Error('Временная ошибка'))
      .mockResolvedValueOnce(undefined);

    const { container, root } = await renderPage();
    await act(async () => { await Promise.resolve(); });
    const button = container.querySelector('button.button--primary');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Временная ошибка');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenCalledTimes(2);
    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenNthCalledWith(1, 201, 'approve', expect.objectContaining({ idempotency_key: 'retry-key' }));
    expect(customerPortalService.decideLegalDocumentStep).toHaveBeenNthCalledWith(2, 201, 'approve', expect.objectContaining({ idempotency_key: 'retry-key' }));

    root.unmount();
  });
});
