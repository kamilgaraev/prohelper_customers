// @vitest-environment jsdom
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractDetailsPage } from './ContractDetailsPage';
import { customerPortalService } from '@shared/api/customerPortalService';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getContract: vi.fn(),
    getContractLegalDocuments: vi.fn(),
    getLegalDocumentUrl: vi.fn(),
    registerLegalDocumentOriginal: vi.fn(),
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
    root.render(<MemoryRouter initialEntries={['/dashboard/contracts/7']}><Routes><Route path="/dashboard/contracts/:contractId" element={<ContractDetailsPage />} /></Routes></MemoryRouter>);
    await Promise.resolve();
    await Promise.resolve();
  });

  return { container, root };
}

describe('ContractDetailsPage legal archive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getContract).mockResolvedValue({ id: 7, number: 'Д-7', subject: 'Договор', status: 'active' } as never);
    vi.mocked(customerPortalService.getContractLegalDocuments).mockResolvedValue([{
      id: 15,
      title: 'Юридический договор',
      document_number: 'ЮД-1',
      document_type: 'contract',
      status: 'active',
      lock_version: 0,
      document_date: null,
      effective_until: null,
      project: null,
      current_version: { id: 29, version_number: '1.0', version_label: null, status: 'ready', processing_status: 'ready', original_filename: 'contract.pdf', mime_type: 'application/pdf', size_bytes: 12, uploaded_at: null },
      versions: [],
      workflow_summary: {},
    }] as never);
  });

  it('opens only a ready current version through a server-issued URL', async () => {
    vi.mocked(customerPortalService.getLegalDocumentUrl).mockResolvedValue('https://storage.example.test/contract.pdf');
    const target = { opener: null, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window);
    const { container, root } = await renderPage();
    const openButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Открыть');

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(customerPortalService.getLegalDocumentUrl).toHaveBeenCalledWith(29, 'preview');
    expect(target.location.replace).toHaveBeenCalledWith('https://storage.example.test/contract.pdf');
    root.unmount();
  });
});
