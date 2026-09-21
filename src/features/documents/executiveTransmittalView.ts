import {
  CustomerExecutiveDocument,
  CustomerExecutiveDocumentSet,
  CustomerExecutiveDocumentVersion,
  CustomerExecutiveTransmittalAction,
} from '@shared/types/dashboard';

export function transmittalActionLabel(action: CustomerExecutiveTransmittalAction): string {
  if (action === 'receive') {
    return 'Подтвердить получение';
  }
  if (action === 'return') {
    return 'Вернуть на исправление';
  }
  return 'Принять';
}

export function transmittalStatusLabel(status: string): string {
  return (
    (
      {
        sent: 'Отправлено',
        received: 'Получено',
        returned: 'Возвращено',
        accepted: 'Принято',
      } as Record<string, string>
    )[status] ?? status
  );
}

export function receivedDocumentVersion(
  document: CustomerExecutiveDocument
): CustomerExecutiveDocumentVersion | undefined {
  return document.versions?.[0];
}

export function matchesExecutiveSearch(set: CustomerExecutiveDocumentSet, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    set.set_number,
    set.title,
    set.project?.name,
    set.stage_name,
    set.zone_name,
    set.transmittal?.transmittal_number,
    ...(set.documents ?? []).map((document) => document.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function describeRevisionChanges(
  current: CustomerExecutiveDocumentSet,
  previous: CustomerExecutiveDocumentSet | null | undefined
): string[] {
  const currentDocuments = current.documents ?? [];
  const previousDocuments = previous?.documents ?? [];
  const previousById = new Map(previousDocuments.map((document) => [document.id, document]));
  const lines: string[] = [];

  for (const document of currentDocuments) {
    const prior = previousById.get(document.id);
    const currentVersion = receivedDocumentVersion(document);
    if (!prior) {
      if (previous) {
        lines.push(
          `${document.title}: добавлен в комплект${currentVersion ? `, редакция ${currentVersion.version_number}` : ''}`
        );
      }
      continue;
    }

    const priorVersion = receivedDocumentVersion(prior);
    if (priorVersion && currentVersion && priorVersion.id !== currentVersion.id) {
      const fromHash = priorVersion.content_hash ? ` (${priorVersion.content_hash.slice(0, 8)})` : '';
      const toHash = currentVersion.content_hash ? ` (${currentVersion.content_hash.slice(0, 8)})` : '';
      lines.push(
        `${document.title}: редакция ${priorVersion.version_number}${fromHash} → ${currentVersion.version_number}${toHash}`
      );
      continue;
    }

    if ((current.transmittal?.changed_document_ids ?? []).includes(document.id) && currentVersion) {
      lines.push(
        `${document.title}: изменена редакция ${currentVersion.version_number} относительно предыдущей передачи`
      );
    }
  }

  if (previous) {
    const currentIds = new Set(currentDocuments.map((document) => document.id));
    for (const document of previousDocuments) {
      if (!currentIds.has(document.id)) {
        lines.push(`${document.title}: убран из комплекта`);
      }
    }
  } else {
    for (const document of currentDocuments) {
      if (!(current.transmittal?.changed_document_ids ?? []).includes(document.id)) {
        continue;
      }
      if (lines.some((line) => line.startsWith(`${document.title}:`))) {
        continue;
      }
      const currentVersion = receivedDocumentVersion(document);
      lines.push(
        `${document.title}: изменена редакция${currentVersion ? ` ${currentVersion.version_number}` : ''} относительно предыдущей передачи`
      );
    }
  }

  return lines;
}
