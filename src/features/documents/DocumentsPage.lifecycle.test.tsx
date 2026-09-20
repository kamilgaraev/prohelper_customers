// @vitest-environment jsdom
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customerPortalService } from '@shared/api/customerPortalService';
import { DocumentsPage } from './DocumentsPage';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getDocuments: vi.fn(),
    getLegalDocuments: vi.fn(),
    getLegalDocumentUrl: vi.fn(),
    getExecutiveTransmittals: vi.fn(),
    addExecutiveDocumentRemark: vi.fn(),
    actOnExecutiveTransmittal: vi.fn(),
    getExecutiveTransmittalVersionUrl: vi.fn(),
  },
}));

const transmission = (id: number, versionId: number, number: string) => ({
  id: 21,
  project_id: 4,
  set_number: 'ED-77',
  title: 'Комплект',
  status: 'transmitted',
  status_label: 'Передано',
  project: { id: 4, name: 'Проект' },
  documents: [{
    id: 30,
    document_type: 'hidden_work_act',
    document_type_label: 'Акт',
    title: 'Акт',
    status: 'transmitted',
    status_label: 'Передан',
    versions: [{ id: versionId, document_id: 30, version_number: number, content_hash: `hash-${versionId}` }],
  }],
  transmittal: {
    id,
    transmittal_number: `TR-${id}`,
    status: 'sent',
    manifest_hash: `manifest-${id}`,
    transmitted_at: '2026-09-20T10:00:00Z',
    changed_document_ids: [],
    available_actions: ['receive', 'return'],
  },
});

async function renderPage(): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
    await Promise.resolve();
  });
  return { container, root };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('DocumentsPage executive documentation lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getDocuments).mockResolvedValue([]);
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([]);
    vi.mocked(customerPortalService.getExecutiveTransmittals).mockResolvedValue([transmission(101, 11, '1.0'), transmission(202, 22, '2.0')] as never);
    vi.mocked(customerPortalService.getExecutiveTransmittalVersionUrl).mockImplementation(async (transmittalId, versionId) => `https://download/${transmittalId}/${versionId}`);
  });

  it('keeps same set revisions isolated for download and exact-version remark', async () => {
    const replace = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ close: vi.fn(), opener: {}, location: { replace } } as unknown as Window);
    const { container, root } = await renderPage();
    const versionButtons = Array.from(container.querySelectorAll('button.text-button')).filter((button) => button.textContent?.startsWith('Версия'));

    await act(async () => { versionButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(customerPortalService.getExecutiveTransmittalVersionUrl).toHaveBeenCalledWith(101, 11);
    await act(async () => { versionButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(customerPortalService.getExecutiveTransmittalVersionUrl).toHaveBeenCalledWith(202, 22);

    const remarkButtons = Array.from(container.querySelectorAll('button.text-button')).filter((button) => button.textContent === 'Добавить замечание');
    await act(async () => { remarkButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    setTextareaValue(textarea, 'Замечание v2');
    await act(async () => { container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(customerPortalService.addExecutiveDocumentRemark).toHaveBeenCalledWith(30, expect.objectContaining({ operation_key: expect.any(String), transmittal_id: 202, version_id: 22, body: 'Замечание v2' }));
    root.unmount();
  });

  it('locks unknown receive result, retries same payload, renews key after 422, and requires reread after 409', async () => {
    const pending = deferred<never>();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReturnValueOnce(pending.promise);
    const { container, root } = await renderPage();
    const receive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Получить') as HTMLButtonElement;
    await act(async () => { receive.click(); });
    const form = container.querySelector('form')!;
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(customerPortalService.actOnExecutiveTransmittal).toHaveBeenCalledTimes(1);
    expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
    pending.reject(new Error('network')); await act(async () => { await Promise.resolve(); });
    expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
    expect((Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Отмена') as HTMLButtonElement).disabled).toBe(true);

    const actionMock = customerPortalService.actOnExecutiveTransmittal as unknown as { mock: { calls: Array<[number, string, { operation_key: string; expected_manifest_hash: string }]> } };
    const firstPayload = actionMock.mock.calls[0][2];
    expect(actionMock.mock.calls[0][0]).toBe(101);
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReset();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockResolvedValueOnce(transmission(101, 11, '1.0') as never);
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Повторить')) as HTMLButtonElement;
    await act(async () => { retry.click(); await Promise.resolve(); });
    expect(actionMock.mock.calls[0][2]).toEqual(firstPayload);

    const secondReceive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Получить') as HTMLButtonElement;
    const error422 = Object.assign(new Error('validation'), { status: 422 });
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReset();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockRejectedValueOnce(error422).mockResolvedValueOnce(transmission(101, 11, '1.0') as never);
    await act(async () => { secondReceive.click(); });
    const formAfterRetry = container.querySelector('form')!;
    await act(async () => { formAfterRetry.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
    setTextareaValue(textarea, 'новое тело');
    await act(async () => { formAfterRetry.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(customerPortalService.actOnExecutiveTransmittal).toHaveBeenCalledTimes(2);
    const actionCalls = (customerPortalService.actOnExecutiveTransmittal as unknown as { mock: { calls: Array<[number, string, { operation_key: string }]> } }).mock.calls;
    expect(actionCalls[0][2].operation_key).not.toBe(actionCalls[1][2].operation_key);

    root.unmount();
  });

  it.each([401, 403, 404, 409])('requires reread after confirmed rejection %s', async (status) => {
    const conflict = Object.assign(new Error('conflict'), { status });
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockRejectedValue(conflict);
    const { container, root } = await renderPage();
    const receive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Получить') as HTMLButtonElement;
    await act(async () => { receive.click(); });
    await act(async () => { container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(container.textContent).toContain('Передача изменилась');
    const reread = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Перечитать передачу') as HTMLButtonElement;
    await act(async () => { reread.click(); await Promise.resolve(); });
    expect(customerPortalService.getExecutiveTransmittals).toHaveBeenCalledTimes(2);
    root.unmount();
  });
});
