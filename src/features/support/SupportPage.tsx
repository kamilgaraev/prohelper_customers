import { FormEvent, useEffect, useState } from 'react';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SupportRequestItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

export function SupportPage() {
  const { value: initialRequests, error: loadError } = useAsyncValue(
    () => customerPortalService.getSupportRequests(),
    []
  );
  const [requests, setRequests] = useState<SupportRequestItem[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialRequests) {
      setRequests(initialRequests);
    }
  }, [initialRequests]);

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

      setRequests((current) => [
        {
          ...request,
          message,
          phone: phone || null
        },
        ...current
      ]);
      setSubject('');
      setMessage('');
      setPhone('');
      setSuccess(`Обращение #${request.id} отправлено. Статус: ${request.statusLabel}.`);
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
        description="Отправляйте запросы по customer-порталу и сразу отслеживайте историю обращений в одном экране."
      />
      <section className="support-grid">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Что можно отправить</h3>
          </div>
          <ul className="simple-list">
            <li>Проблемы с доступом в customer-портал</li>
            <li>Вопросы по документам, согласованиям и уведомлениям</li>
            <li>Ошибки в отображении данных и работе интерфейса</li>
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

      <section className="list-surface">
        <div className="panel-head">
          <h3>История обращений</h3>
          <span>{requests.length}</span>
        </div>
        {loadError ? <div className="form-error">{loadError}</div> : null}
        {requests.length ? (
          requests.map((item) => (
            <article key={item.id} className="list-row list-row--surface support-history-row">
              <div className="support-history-copy">
                <strong>{item.subject}</strong>
                <p>{item.message}</p>
                <p>{item.createdAtLabel ?? 'Дата уточняется'}</p>
              </div>
              <div className="row-actions">
                {item.phone ? <p className="conversation-preview">{item.phone}</p> : null}
                <StatusPill tone={item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'neutral' : 'warning'}>
                  {item.statusLabel}
                </StatusPill>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">История обращений пока пуста. Новые запросы появятся здесь сразу после отправки.</p>
        )}
      </section>
    </div>
  );
}
