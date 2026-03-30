import { SectionHeading } from '@shared/ui/SectionHeading';

export function SupportPage() {
  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Support"
        title="Поддержка платформы"
        description="Отдельный канал для вопросов по работе кабинета, доступам и техническим проблемам."
      />
      <section className="support-grid">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Что должно поддерживаться</h3>
          </div>
          <ul className="simple-list">
            <li>Обращения по доступам</li>
            <li>Проблемы с загрузкой документов</li>
            <li>Ошибки уведомлений и переписки</li>
          </ul>
        </article>
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Форма v1</h3>
          </div>
          <form className="inline-form">
            <input type="text" placeholder="Тема обращения" />
            <textarea rows={5} placeholder="Опишите проблему или запрос" />
            <button type="button">Отправить запрос</button>
          </form>
        </article>
      </section>
    </div>
  );
}

