import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { Button, Field, Panel } from '@shared/ui';
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
        eyebrow="Проекты"
        title="Создание проекта"
        description="Создайте проект в кабинете заказчика и сразу перейдите к приглашению генподрядчика или подрядчика."
      />

      <Panel className="plain-panel plain-panel--wide">
        <form className="inline-form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid--two">
            <Field label="Название проекта" htmlFor="project-name">
              <input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Например, Строительство школы"
                required
              />
            </Field>

            <Field label="Номер договора" htmlFor="project-contract-number">
              <input
                id="project-contract-number"
                value={form.contract_number}
                onChange={(event) => setForm((current) => ({ ...current, contract_number: event.target.value }))}
                placeholder="При наличии"
              />
            </Field>

            <Field className="form-grid__wide" label="Адрес" htmlFor="project-address">
              <input
                id="project-address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Город, улица, ориентир"
              />
            </Field>

            <Field className="form-grid__wide" label="Описание" htmlFor="project-description">
              <textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Кратко опишите объект и текущую задачу"
                rows={4}
              />
            </Field>

            <Field label="Дата начала" htmlFor="project-start-date">
              <input
                id="project-start-date"
                type="date"
                value={form.start_date}
                onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </Field>

            <Field label="Дата завершения" htmlFor="project-end-date">
              <input
                id="project-end-date"
                type="date"
                value={form.end_date}
                onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              />
            </Field>

            <Field label="Бюджет" htmlFor="project-budget">
              <input
                id="project-budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget_amount}
                onChange={(event) => setForm((current) => ({ ...current, budget_amount: event.target.value }))}
                placeholder="0"
              />
            </Field>
          </div>

          {error ? <div className="form-error" role="alert">{error}</div> : null}

          <div className="button-row">
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Создаем проект...' : 'Создать проект'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/projects')}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
