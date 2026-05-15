// @vitest-environment jsdom
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HandoverPage } from './HandoverPage';
import { customerPortalService } from '@shared/api/customerPortalService';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getHandoverScopes: vi.fn(),
    signHandoverScope: vi.fn(),
    rejectHandoverScope: vi.fn(),
  },
}));

const baseScope = {
  id: 10,
  project_id: 9,
  project_location_id: 7,
  title: 'Секция А / этаж 2',
  description: 'Чистовая приемка',
  status: 'findings_open',
  workflow_summary: {
    status: 'findings_open',
    available_actions: [],
    problem_flags: [{ key: 'open_findings', severity: 'warning', label: 'Есть открытые замечания', count: 1 }],
  },
  project: { id: 9, name: 'ЖК Север' },
  location: {
    id: 7,
    project_id: 9,
    location_type: 'floor',
    name: 'Этаж 2',
    path: 'Секция А / этаж 2',
    level: 2,
  },
  findings: [{
    id: 31,
    acceptance_scope_id: 10,
    acceptance_session_id: 21,
    quality_defect_id: 55,
    title: 'Скол плитки',
    description: 'Заменить элемент',
    severity: 'major',
    status: 'open',
  }],
  handover_package: {
    id: 40,
    acceptance_scope_id: 10,
    title: 'Комплект передачи',
    status: 'draft',
    documents: [{
      id: 41,
      title: 'Исполнительная документация',
      document_type: 'executive_documentation',
      is_required: true,
      status: 'draft',
    }],
  },
};

async function renderPage(): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <HandoverPage />
      </MemoryRouter>
    );
  });

  return { container, root };
}

describe('HandoverPage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getHandoverScopes).mockResolvedValue([baseScope] as any);
    vi.mocked(customerPortalService.signHandoverScope).mockResolvedValue({ ...baseScope, status: 'handed_over' } as any);
    vi.mocked(customerPortalService.rejectHandoverScope).mockResolvedValue({ ...baseScope, status: 'reopened' } as any);
  });

  it('shows customer-visible handover scope, punch-list and required documents', async () => {
    const { container, root } = await renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    expect(customerPortalService.getHandoverScopes).toHaveBeenCalledWith({});
    expect(container.textContent).toContain('Приемка зон');
    expect(container.textContent).toContain('Секция А / этаж 2');
    expect(container.textContent).toContain('ЖК Север');
    expect(container.textContent).toContain('Скол плитки');
    expect(container.textContent).toContain('Исполнительная документация');
    expect(container.textContent).toContain('На проверке');

    root.unmount();
  });

  it('allows customer to sign and reject accepted handover scope', async () => {
    vi.mocked(customerPortalService.getHandoverScopes).mockResolvedValue([
      {
        ...baseScope,
        status: 'accepted',
        workflow_summary: {
          status: 'accepted',
          available_actions: ['handover', 'reject'],
          problem_flags: [],
        },
        findings: [],
        handover_package: {
          ...baseScope.handover_package,
          status: 'approved',
          documents: [{
            ...baseScope.handover_package.documents[0],
            status: 'approved',
          }],
        },
      },
    ] as any);
    const { container, root } = await renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    const signButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Подтвердить передачу');
    expect(signButton).toBeTruthy();

    await act(async () => {
      signButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.signHandoverScope).toHaveBeenCalledWith(10);

    const textarea = container.querySelector('textarea');
    await act(async () => {
      if (textarea) {
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        valueSetter?.call(textarea, 'Нужно проверить комплект ключей');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const rejectButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Вернуть на доработку');
    await act(async () => {
      rejectButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.rejectHandoverScope).toHaveBeenCalledWith(10, {
      reason: 'Нужно проверить комплект ключей',
    });

    root.unmount();
  });
});
