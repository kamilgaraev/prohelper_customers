import { FormEvent, useState } from 'react';

import { customerPortalService } from '@shared/api/customerPortalService';
import { SectionHeading } from '@shared/ui/SectionHeading';

export function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const request = await customerPortalService.createSupportRequest({
        subject,
        message,
        phone: phone || undefined
      });

      setSubject('');
      setMessage('');
      setPhone('');
      setSuccess(`Обращение #${request.id} отправлено. Статус: ${request.status}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить обращение');
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <h3>Что можно отправить</h3>
          </div>
          <ul className="simple-list">
            <li>Проблемы с доступом в customer-портал</li>
            <li>Вопросы по документам, согласованиям и уведомлениям</li>
            <li>Ошибки в отображении данных или работе интерфейса</li>
          </ul>
        </article>
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Форма обращения</h3>
          </div>
          <form className="inline-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Тема обращения"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            <input
              type="text"
              placeholder="Телефон для обратной связи"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <textarea
              rows={5}
              placeholder="Опишите проблему или запрос"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            {error ? <div className="form-error">{error}</div> : null}
            {success ? <div className="form-success">{success}</div> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Отправляем...' : 'Отправить запрос'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
