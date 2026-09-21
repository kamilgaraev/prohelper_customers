// @vitest-environment jsdom
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customerPortalService } from '@shared/api/customerPortalService';
import { CustomerExecutiveDocumentSet } from '@shared/types/dashboard';
import { DocumentsPage } from './DocumentsPage';

vi.mock('@shared/api/customerPortalService', () => ({
  customerPortalService: {
    getDocuments: vi.fn(),
    getProjects: vi.fn(),
    getLegalDocuments: vi.fn(),
    getLegalDocumentUrl: vi.fn(),
    getExecutiveTransmittals: vi.fn(),
    addExecutiveDocumentRemark: vi.fn(),
    actOnExecutiveTransmittal: vi.fn(),
    getExecutiveTransmittalVersionUrl: vi.fn(),
    acknowledgeExecutiveDocumentSet: vi.fn(),
  },
}));

function project(id: number, name: string) {
  return {
    id,
    name,
    location: '',
    phase: '',
    completion: 0,
    budgetLabel: '',
    leadLabel: '',
  };
}

function transmission(options: {
  transmittalId: number;
  versionId: number;
  versionNumber: string;
  projectId: number;
  projectName: string;
  title?: string;
  documentTitle?: string;
  previousTransmittalId?: number;
  changedDocumentIds?: number[];
  extraVersionId?: number;
}): CustomerExecutiveDocumentSet {
  const versions = [
    {
      id: options.versionId,
      document_id: options.projectId === 9 ? 40 : 30,
      version_number: options.versionNumber,
      content_hash: `hash-${options.versionId}`,
    },
  ];
  if (options.extraVersionId) {
    versions.push({
      id: options.extraVersionId,
      document_id: options.projectId === 9 ? 40 : 30,
      version_number: 'черновик',
      content_hash: `hash-${options.extraVersionId}`,
    });
  }

  return {
    id: options.projectId === 9 ? 22 : 21,
    project_id: options.projectId,
    set_number: options.projectId === 9 ? 'ED-90' : 'ED-77',
    title: options.title ?? (options.projectId === 9 ? 'Комплект Б' : 'Комплект А'),
    status: 'transmitted',
    status_label: 'Передано',
    project: { id: options.projectId, name: options.projectName },
    documents: [
      {
        id: options.projectId === 9 ? 40 : 30,
        document_type: 'hidden_work_act',
        document_type_label: 'Акт',
        title: options.documentTitle ?? 'Акт',
        status: 'transmitted',
        status_label: 'Передан',
        versions,
      },
    ],
    transmittal: {
      id: options.transmittalId,
      transmittal_number: `TR-${options.transmittalId}`,
      status: 'sent',
      manifest_hash: `manifest-${options.transmittalId}`,
      transmitted_at: '2026-09-20T10:00:00Z',
      previous_transmittal_id: options.previousTransmittalId ?? null,
      changed_document_ids: options.changedDocumentIds ?? [],
      available_actions: ['receive', 'return'],
    },
  };
}

async function renderPage(initialPath = '/documents'): Promise<{ container: HTMLDivElement; root: Root }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <DocumentsPage />
      </MemoryRouter>
    );
    await Promise.resolve();
  });
  return { container, root };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('DocumentsPage executive documentation lifecycle', () => {
  const setA = transmission({
    transmittalId: 101,
    versionId: 11,
    versionNumber: '1.0',
    projectId: 4,
    projectName: 'Проект А',
    documentTitle: 'Акт фундамента',
  });
  const setB = transmission({
    transmittalId: 202,
    versionId: 22,
    versionNumber: '2.0',
    projectId: 9,
    projectName: 'Проект Б',
    documentTitle: 'Акт кровли',
    extraVersionId: 88,
  });
  const setARepeat = transmission({
    transmittalId: 303,
    versionId: 33,
    versionNumber: '2.0',
    projectId: 4,
    projectName: 'Проект А',
    documentTitle: 'Акт фундамента',
    previousTransmittalId: 101,
    changedDocumentIds: [30],
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(customerPortalService.getDocuments).mockResolvedValue([]);
    vi.mocked(customerPortalService.getLegalDocuments).mockResolvedValue([]);
    vi.mocked(customerPortalService.getProjects).mockResolvedValue([project(4, 'Проект А'), project(9, 'Проект Б')]);
    vi.mocked(customerPortalService.getExecutiveTransmittals).mockResolvedValue({ items: [setA, setB], meta: null });
    vi.mocked(customerPortalService.getExecutiveTransmittalVersionUrl).mockImplementation(
      async (transmittalId, versionId) => `https://download/${transmittalId}/${versionId}`
    );
  });

  it('keeps same set revisions isolated for download and exact-version remark', async () => {
    const replace = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ close: vi.fn(), opener: {}, location: { replace } } as unknown as Window);
    const { container, root } = await renderPage();
    const versionButtons = Array.from(container.querySelectorAll('button.text-button')).filter((button) =>
      button.textContent?.startsWith('Редакция')
    );

    await act(async () => {
      versionButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(customerPortalService.getExecutiveTransmittalVersionUrl).toHaveBeenCalledWith(101, 11);
    await act(async () => {
      versionButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(customerPortalService.getExecutiveTransmittalVersionUrl).toHaveBeenCalledWith(202, 22);

    const remarkButtons = Array.from(container.querySelectorAll('button.text-button')).filter(
      (button) => button.textContent === 'Добавить замечание'
    );
    await act(async () => {
      remarkButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    setTextareaValue(textarea, 'Замечание v2');
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(customerPortalService.addExecutiveDocumentRemark).toHaveBeenCalledWith(
      40,
      expect.objectContaining({ operation_key: expect.any(String), transmittal_id: 202, version_id: 22, body: 'Замечание v2' })
    );
    expect(customerPortalService.acknowledgeExecutiveDocumentSet).not.toHaveBeenCalled();
    root.unmount();
  });

  it('does not mix kits of two projects and binds a remark to the received revision', async () => {
    vi.mocked(customerPortalService.getExecutiveTransmittals).mockImplementation(async (filters) => {
      if (filters?.project_id === 4) {
        return { items: [setA], meta: null };
      }
      if (filters?.project_id === 9) {
        return { items: [setB], meta: null };
      }
      return { items: [setA, setB], meta: null };
    });

    const { container, root } = await renderPage();
    expect(container.textContent).toContain('Комплект А');
    expect(container.textContent).toContain('Комплект Б');

    const projectSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.textContent === 'Проект Б')
    ) as HTMLSelectElement;
    await act(async () => {
      setSelectValue(projectSelect, '9');
      await Promise.resolve();
    });

    expect(customerPortalService.getExecutiveTransmittals).toHaveBeenCalledWith({ project_id: 9 });
    expect(container.textContent).toContain('Комплект Б');
    expect(container.textContent).not.toContain('Комплект А');
    expect(container.textContent).toContain('Акт кровли');
    expect(container.textContent).not.toContain('Акт фундамента');

    const remarkButtons = Array.from(container.querySelectorAll('button.text-button')).filter(
      (button) => button.textContent === 'Добавить замечание'
    );
    await act(async () => {
      remarkButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Замечание к полученной редакции 2.0');
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    setTextareaValue(textarea, 'Замечание к полученной редакции Б');
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(customerPortalService.addExecutiveDocumentRemark).toHaveBeenCalledWith(
      40,
      expect.objectContaining({ transmittal_id: 202, version_id: 22, body: 'Замечание к полученной редакции Б' })
    );
    expect(customerPortalService.addExecutiveDocumentRemark).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ version_id: 88 })
    );
    expect(customerPortalService.addExecutiveDocumentRemark).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ version_id: 11 })
    );
    root.unmount();
  });

  it('shows revision differences instead of a generic new-version label', async () => {
    vi.mocked(customerPortalService.getExecutiveTransmittals).mockResolvedValue({ items: [setA, setARepeat], meta: null });
    const { container, root } = await renderPage();
    expect(container.textContent).toContain('Различия с предыдущей передачей');
    expect(container.textContent).toContain('Акт фундамента: редакция 1.0');
    expect(container.textContent).toContain('→ 2.0');
    expect(container.textContent).not.toContain('просто новая версия');
    root.unmount();
  });

  it('filters loaded transmittals by status without sending unsupported query params', async () => {
    const received: CustomerExecutiveDocumentSet = {
      ...setA,
      transmittal: {
        ...setA.transmittal!,
        status: 'received',
        available_actions: ['return', 'accept'],
      },
    };
    vi.mocked(customerPortalService.getExecutiveTransmittals).mockResolvedValue({ items: [received, setB], meta: null });
    const { container, root } = await renderPage();
    const statusSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.textContent === 'Получено')
    ) as HTMLSelectElement;
    await act(async () => {
      setSelectValue(statusSelect, 'received');
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Комплект А');
    expect(container.textContent).not.toContain('Комплект Б');
    expect(customerPortalService.getExecutiveTransmittals).toHaveBeenCalledWith({});
    expect(customerPortalService.getExecutiveTransmittals).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'received' }));
    root.unmount();
  });

  it('locks unknown receive result, retries same payload, renews key after 422, and requires reread after 409', async () => {
    const pending = deferred<never>();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReturnValueOnce(pending.promise);
    const { container, root } = await renderPage();
    const receive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Подтвердить получение') as HTMLButtonElement;
    await act(async () => {
      receive.click();
    });
    const form = container.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(customerPortalService.actOnExecutiveTransmittal).toHaveBeenCalledTimes(1);
    expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
    pending.reject(new Error('network'));
    await act(async () => {
      await Promise.resolve();
    });
    expect((container.querySelector('textarea') as HTMLTextAreaElement).disabled).toBe(true);
    expect((Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Отмена') as HTMLButtonElement).disabled).toBe(true);

    const actionMock = customerPortalService.actOnExecutiveTransmittal as unknown as {
      mock: { calls: Array<[number, string, { operation_key: string; expected_manifest_hash: string }]> };
    };
    const firstPayload = actionMock.mock.calls[0][2];
    expect(actionMock.mock.calls[0][0]).toBe(101);
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReset();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockResolvedValueOnce(setA);
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Повторить')) as HTMLButtonElement;
    await act(async () => {
      retry.click();
      await Promise.resolve();
    });
    expect(actionMock.mock.calls[0][2]).toEqual(firstPayload);

    const secondReceive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Подтвердить получение') as HTMLButtonElement;
    const error422 = Object.assign(new Error('validation'), { status: 422 });
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockReset();
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockRejectedValueOnce(error422).mockResolvedValueOnce(setA);
    await act(async () => {
      secondReceive.click();
    });
    const formAfterRetry = container.querySelector('form')!;
    await act(async () => {
      formAfterRetry.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
    setTextareaValue(textarea, 'новое тело');
    await act(async () => {
      formAfterRetry.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(customerPortalService.actOnExecutiveTransmittal).toHaveBeenCalledTimes(2);
    const actionCalls = (customerPortalService.actOnExecutiveTransmittal as unknown as { mock: { calls: Array<[number, string, { operation_key: string }]> } })
      .mock.calls;
    expect(actionCalls[0][2].operation_key).not.toBe(actionCalls[1][2].operation_key);

    root.unmount();
  });

  it.each([401, 403, 404, 409])('requires reread after confirmed rejection %s', async (status) => {
    const conflict = Object.assign(new Error('conflict'), { status });
    vi.mocked(customerPortalService.actOnExecutiveTransmittal).mockRejectedValue(conflict);
    const { container, root } = await renderPage();
    const receive = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Подтвердить получение') as HTMLButtonElement;
    await act(async () => {
      receive.click();
    });
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Передача изменилась');
    const reread = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Перечитать передачу') as HTMLButtonElement;
    await act(async () => {
      reread.click();
      await Promise.resolve();
    });
    expect(customerPortalService.getExecutiveTransmittals).toHaveBeenCalledTimes(2);
    root.unmount();
  });
});
