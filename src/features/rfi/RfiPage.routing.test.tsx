// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), recipients: vi.fn(), get: vi.fn(), getProjects: vi.fn(), canView: vi.fn(),
}));

vi.mock('./rfiService', () => ({ rfiService: { list: mocks.list, recipients: mocks.recipients, get: mocks.get } }));
vi.mock('@shared/api/customerPortalService', () => ({ customerPortalService: { getProjects: mocks.getProjects } }));
vi.mock('@shared/contexts/PermissionsContext', () => ({ usePermissions: () => ({ canAccess: mocks.canView, isLoaded: true }) }));

import { RfiPage } from './RfiPage';

const firstRfi = {
  id: 11,
  project_id: 7,
  initiator_organization_id: 2,
  recipient_organization_id: 3,
  status: 'sent',
  subject: 'Первый вопрос',
  question: 'Первый текст',
  available_actions: [],
  history: [],
  created_at: '2026-08-01T09:00:00Z',
  updated_at: '2026-08-02T09:00:00Z',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

let mountedRoots: Array<{ root: Root; host: HTMLDivElement }> = [];

async function renderPage(search: string) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push({ root, host });
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[`/dashboard/rfi${search}`]}><RfiPage /><LocationProbe /></MemoryRouter>);
  });
  return host;
}

async function waitForText(host: HTMLElement, text: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (host.textContent?.includes(text)) return;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
  throw new Error(`Не найден текст: ${text}`);
}

describe('RfiPage deep links', () => {
  beforeEach(() => {
    mountedRoots = [];
    mocks.list.mockReset().mockResolvedValue({ items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } });
    mocks.recipients.mockReset().mockResolvedValue([]);
    mocks.get.mockReset().mockImplementation(async (id: number) => ({ ...firstRfi, id, subject: `Вопрос ${id}` }));
    mocks.getProjects.mockReset().mockResolvedValue([]);
    mocks.canView.mockReset().mockReturnValue(true);
  });

  afterEach(async () => {
    await act(async () => { mountedRoots.forEach(({ root }) => root.unmount()); });
    mountedRoots.forEach(({ host }) => host.remove());
  });

  it('opens an RFI by id even when it is absent from the current list page', async () => {
    const host = await renderPage('?project_id=7&id=99');

    await waitForText(host, 'Вопрос 99');
    expect(mocks.get).toHaveBeenCalledWith(99);
    expect(mocks.list).toHaveBeenCalledWith(7, 'incoming');
  });

  it('updates the id query parameter when the user selects a list item', async () => {
    mocks.list.mockResolvedValue({ items: [firstRfi, { ...firstRfi, id: 12, subject: 'Второй вопрос' }], pagination: { current_page: 1, per_page: 100, total: 2, last_page: 1 } });
    const host = await renderPage('?project_id=7');
    await waitForText(host, 'Вопрос 11');

    const secondItem = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('Второй вопрос'));
    expect(secondItem).toBeDefined();
    await act(async () => { secondItem?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await waitForText(host, 'Вопрос 12');

    expect(host.querySelector('[data-testid="location-search"]')?.textContent).toContain('id=12');
    expect(mocks.get).toHaveBeenLastCalledWith(12);
  });

  it('opens a saved draft and keeps creating a new draft as a separate action', async () => {
    const savedDraft = { ...firstRfi, id: 22, status: 'draft', subject: 'Сохранённый черновик', available_actions: ['send'] };
    mocks.list.mockImplementation(async (_projectId: number, direction: string) => direction === 'drafts'
      ? { items: [savedDraft], pagination: { current_page: 1, per_page: 100, total: 1, last_page: 1 } }
      : { items: [], pagination: { current_page: 1, per_page: 100, total: 0, last_page: 1 } });
    mocks.get.mockImplementation(async (id: number) => id === 22 ? savedDraft : { ...firstRfi, id, subject: `Вопрос ${id}` });
    const host = await renderPage('?project_id=7');
    await waitForText(host, 'Вопросов в этом разделе пока нет.');

    const draftsTab = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('Черновики'));
    await act(async () => { draftsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await waitForText(host, 'Сохранённый черновик');
    expect(host.textContent).toContain('Отправить вопрос');
    expect(host.querySelector('textarea')).toBeNull();

    const createButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Новый вопрос');
    await act(async () => { createButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await waitForText(host, 'Сохранить черновик');
    expect(host.querySelector('textarea')).not.toBeNull();
  });
});
