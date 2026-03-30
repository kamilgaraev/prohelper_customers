import { SectionHeading } from '@shared/ui/SectionHeading';

export function DocumentsPage() {
  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Documents"
        title="Центр документов заказчика"
        description="Единая точка доступа к договорам, актам, вложениям и исполнительной документации в customer-safe формате."
      />
      <section className="plain-panel plain-panel--wide">
        <div className="panel-head">
          <h3>План структуры</h3>
        </div>
        <ul className="simple-list">
          <li>Контракты и допсоглашения</li>
          <li>Акты и подтверждающие файлы</li>
          <li>Проектные вложения и спецификации</li>
          <li>Фильтры по проекту, типу и статусу</li>
        </ul>
      </section>
    </div>
  );
}

