import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function DocumentsPage() {
  const { value: documents, error } = useAsyncValue(() => customerPortalService.getDocuments(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Documents"
        title="Центр документов заказчика"
        description="Единая точка доступа к договорам, актам, вложениям и исполнительной документации в customer-safe формате."
      />
      <section className="list-surface">
        {error ? <div className="form-error">{error}</div> : null}
        {documents?.length ? (
          documents.map((item) => (
            <article key={item.id} className="list-row list-row--surface">
              <div>
                <strong>{item.title}</strong>
                <p>{item.projectName ?? 'Без привязки к проекту'}</p>
              </div>
              <div className="row-actions">
                <p className="conversation-preview">{item.category ?? item.type ?? 'Документ'}</p>
                <StatusPill tone="neutral">{item.uploadedAtLabel ?? 'Без даты'}</StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">Документы пока не опубликованы.</p>
        )}
      </section>
    </div>
  );
}
