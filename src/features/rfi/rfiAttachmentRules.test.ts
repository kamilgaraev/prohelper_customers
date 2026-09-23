import { describe, expect, it } from 'vitest';

import { formatRfiFileSize, validateRfiAttachment } from './rfiAttachmentRules';

describe('RFI attachment rules', () => {
  it('accepts supported files and rejects unsupported extension or mismatched MIME type', () => {
    expect(validateRfiAttachment(new File(['pdf'], 'drawing.PDF', { type: 'application/pdf' }))).toBeNull();
    expect(validateRfiAttachment(new File(['data'], 'drawing.exe', { type: 'application/octet-stream' }))).toContain('Поддерживаются');
    expect(validateRfiAttachment(new File(['data'], 'drawing.pdf', { type: 'image/png' }))).toContain('не соответствует');
  });

  it('enforces the 20 MiB limit and formats the displayed size', () => {
    const oversized = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
    expect(validateRfiAttachment(oversized)).toContain('20 МБ');
    expect(formatRfiFileSize(20 * 1024 * 1024)).toBe('20 МБ');
    expect(formatRfiFileSize(null)).toBe('Размер неизвестен');
  });
});
