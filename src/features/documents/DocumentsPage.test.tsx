// @vitest-environment jsdom
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentsPage } from './DocumentsPage';
import { customerPortalService } from '@shared/api/customerPortalService';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getDocuments: vi.fn(),
    getLegalDocuments: vi.fn(),
    getLegalDocumentUrl: vi.fn(),
    getExecutiveDocumentSets: vi.fn(),
  },
}));

async function renderPage(): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return { container, root };
}

describe('DocumentsPage legal archive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getDocuments).mockResolvedValue([]);
    vi.mocked(customerPortalService.getExecutiveDocumentSets).mockResolvedValue([]);
  });

  it('shows only ready versions and opens a backend-issued URL in a safe pre-opened window', async () => {
    const replace = vi.fn();
    const target = {
      close: vi.fn(),
      opener: {} as Window | null,
      location: { replace },
    } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(target);
    vi.mocked(customerPortalService.getLegalDocumentUrl).mockResolvedValue('https://storage.example.test/signed-version-71');
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([
      {
        id: 7,
        title: 'Contract archive',
        document_number: 'C-7',
        document_type: 'contract',
        status: 'active',
        lock_version: 1,
        document_date: null,
        effective_until: null,
        project: null,
        current_version: {
          id: 71,
          version_number: '2',
          version_label: null,
          status: 'approved',
          processing_status: 'ready',
          original_filename: 'contract-v2.pdf',
          mime_type: 'application/pdf',
          size_bytes: 12,
          uploaded_at: null,
        },
        versions: [
          {
            id: 71,
            version_number: '2',
            version_label: null,
            status: 'approved',
            processing_status: 'ready',
            original_filename: 'contract-v2.pdf',
            mime_type: 'application/pdf',
            size_bytes: 12,
            uploaded_at: null,
          },
          {
            id: 70,
            version_number: '1',
            version_label: null,
            status: 'draft',
            processing_status: 'processing',
            original_filename: 'contract-v1.pdf',
            mime_type: 'application/pdf',
            size_bytes: 10,
            uploaded_at: null,
          },
        ],
        workflow_summary: {},
      },
    ]);

    const { container, root } = await renderPage();

    expect(container.textContent).toContain('contract-v2.pdf');
    expect(container.textContent).not.toContain('contract-v1.pdf');

    const openVersionButton = Array.from(container.querySelectorAll('button.text-button'))[0];

    await act(async () => {
      openVersionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(target.opener).toBeNull();
    expect(customerPortalService.getLegalDocumentUrl).toHaveBeenCalledWith(71, 'preview');
    expect(replace).toHaveBeenCalledWith('https://storage.example.test/signed-version-71');
    expect(container.innerHTML).not.toContain('https://storage.example.test/signed-version-71');

    root.unmount();
  });

  it('does not expose preview or download actions for a version that is not ready', async () => {
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([
      {
        id: 8,
        title: 'Processing contract',
        document_number: null,
        document_type: 'contract',
        status: 'draft',
        lock_version: 1,
        document_date: null,
        effective_until: null,
        project: null,
        current_version: {
          id: 81,
          version_number: '1',
          version_label: null,
          status: 'draft',
          processing_status: 'processing',
          original_filename: 'processing.pdf',
          mime_type: 'application/pdf',
          size_bytes: 12,
          uploaded_at: null,
        },
        versions: [],
        workflow_summary: {},
      },
    ]);

    const { container, root } = await renderPage();

    expect(container.querySelectorAll('button.text-button')).toHaveLength(0);
    expect(customerPortalService.getLegalDocumentUrl).not.toHaveBeenCalled();

    root.unmount();
  });
});
