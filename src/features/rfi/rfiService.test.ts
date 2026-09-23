import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedGet, mockedPost } = vi.hoisted(() => ({ mockedGet: vi.fn(), mockedPost: vi.fn() }));

vi.mock('@shared/api/customerApi', () => ({ customerApi: { get: mockedGet, post: mockedPost } }));

import { rfiService } from './rfiService';

describe('RFI customer API', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('requests the requested RFI list page with the backend pagination parameters', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: { items: [], pagination: { current_page: 2, per_page: 100, total: 101, last_page: 2 } },
      },
    });

    const result = await rfiService.list(7, 'incoming', 2);

    expect(mockedGet).toHaveBeenCalledWith('/change-management/rfis', {
      params: { project_id: 7, direction: 'incoming', page: 2, per_page: 100 },
    });
    expect(result.pagination.current_page).toBe(2);
    expect(result.pagination.last_page).toBe(2);
  });

  it('uploads a file in the multipart `file` field and returns the updated RFI resource', async () => {
    const file = new File(['drawing'], 'plan.pdf', { type: 'application/pdf' });
    const updatedRfi = { id: 14, project_id: 7, attachments: [{ id: 'att-9', name: 'plan.pdf', mime_type: null, size: null }] };
    mockedPost.mockResolvedValue({ data: { success: true, data: updatedRfi } });

    const result = await rfiService.uploadAttachment(14, file);

    expect(mockedPost).toHaveBeenCalledOnce();
    const [path, body, config] = mockedPost.mock.calls[0];
    expect(path).toBe('/change-management/rfis/14/attachments');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(result.attachments).toEqual(updatedRfi.attachments);
  });

  it('posts the clarification message to the backend clarification endpoint', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, data: { id: 14, project_id: 7 } } });

    await rfiService.requestClarification(14, 'Уточните обозначение на схеме.');

    expect(mockedPost).toHaveBeenCalledWith('/change-management/rfis/14/clarification', { message: 'Уточните обозначение на схеме.' });
  });

  it('requests an authorized short lived download URL for the selected RFI attachment', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, data: { url: 'https://files.example.test/temporary', expires_in: 300 } } });

    await expect(rfiService.getAttachmentDownloadUrl(14, 'att-9')).resolves.toBe('https://files.example.test/temporary');
    expect(mockedGet).toHaveBeenCalledWith('/change-management/rfis/14/attachments/att-9/download');
  });
});
