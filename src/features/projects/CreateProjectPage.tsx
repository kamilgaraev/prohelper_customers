import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { SectionHeading } from '@shared/ui/SectionHeading';

interface ProjectFormState {
  name: string;
  address: string;
  description: string;
  start_date: string;
  end_date: string;
  budget_amount: string;
  contract_number: string;
}

const initialFormState: ProjectFormState = {
  name: '',
  address: '',
  description: '',
  start_date: '',
  end_date: '',
  budget_amount: '',
  contract_number: '',
};

export function CreateProjectPage() {
  const navigate = useNavigate();
  const { canAccess } = usePermissions();
  const [form, setForm] = useState<ProjectFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canAccess({ permission: 'customer.projects.manage' })) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const project = await customerPortalService.createProject({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        description: form.description.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : undefined,
        contract_number: form.contract_number.trim() || undefined,
        status: 'active',
      });

      navigate(`/dashboard/projects/${project.id}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Не удалось создать проект');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Projects"
        title="Создание проекта"
        description="Создайте проект в кабинете заказчика и сразу перейдите к приглашению генподрядчика или подрядчика."
      />

      <section className="plain-panel plain-panel--wide">
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--two">
            <label>
              <span>Название проекта</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Например, Строительство школы"
                required
              />
            </label>

            <label>
              <span>Номер договора</span>
              <input
                value={form.contract_number}
                onChange={(event) => setForm((current) => ({ ...current, contract_number: event.target.value }))}
                placeholder="При наличии"
              />
            </label>

            <label className="form-grid__wide">
              <span>Адрес</span>
              <input
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Город, улица, ориентир"
              />
            </label>

            <label className="form-grid__wide">
              <span>Описание</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Кратко опишите объект и текущую задачу"
                rows={4}
              />
            </label>

            <label>
              <span>Дата начала</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </label>

            <label>
              <span>Дата завершения</span>
              <input
                type="date"
                value={form.end_date}
                onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              />
            </label>

            <label>
              <span>Бюджет</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget_amount}
                onChange={(event) => setForm((current) => ({ ...current, budget_amount: event.target.value }))}
                placeholder="0"
              />
            </label>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="button-row">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Создаем проект...' : 'Создать проект'}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate('/dashboard/projects')}
              disabled={isSubmitting}
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
