const maxAttachmentBytes = 20 * 1024 * 1024;

const acceptedAttachmentTypes: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  png: ['image/png'],
  jpg: ['image/jpeg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
};

export const acceptedAttachmentInput = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

export function validateRfiAttachment(file: File): string | null {
  if (file.size > maxAttachmentBytes) return 'Размер файла не должен превышать 20 МБ.';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const acceptedMimeTypes = acceptedAttachmentTypes[extension];
  if (!acceptedMimeTypes) return 'Поддерживаются PDF, DOC, DOCX, XLS, XLSX, PNG и JPG.';
  if (file.type && !acceptedMimeTypes.includes(file.type.toLowerCase())) return 'Тип файла не соответствует его расширению.';
  return null;
}

export function formatRfiFileSize(size: number | null): string {
  if (size === null) return 'Размер неизвестен';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / (1024 * 1024)).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
}
