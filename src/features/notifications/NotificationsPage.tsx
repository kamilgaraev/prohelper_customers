import { SectionHeading } from '@shared/ui/SectionHeading';

export function NotificationsPage() {
  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Notifications"
        title="Сигналы и события"
        description="Непрочитанные сообщения, новые документы и обновления по согласованиям в одном feed."
      />
      <section className="plain-panel plain-panel--wide">
        <div className="panel-head">
          <h3>Notification model</h3>
        </div>
        <ul className="simple-list">
          <li>Новый документ требует просмотра</li>
          <li>Изменился статус согласования</li>
          <li>В треде появились новые сообщения</li>
          <li>Изменились сроки или фаза проекта</li>
        </ul>
      </section>
    </div>
  );
}

