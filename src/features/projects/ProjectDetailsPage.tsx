import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import {
  CustomerOrganizationSearchItem,
  CustomerProjectParticipantInvitation,
  CustomerProjectParticipantsResponse,
  ProjectTimelineItem,
  ProjectWorkspaceResponse,
} from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate } from '@shared/utils/format';

interface InvitationFormState {
  role: 'general_contractor' | 'contractor';
  organization_id?: number;
  organization_name: string;
  email: string;
  inn: string;
  contact_name: string;
  phone: string;
  message: string;
}

const initialInvitationForm: InvitationFormState = {
  role: 'general_contractor',
  organization_name: '',
  email: '',
  inn: '',
  contact_name: '',
  phone: '',
  message: '',
};

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Сумма уточняется';
  }

  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getTimelineLink(item: ProjectTimelineItem): string | null {
  switch (item.related_entity?.type) {
    case 'contract':
      return `/dashboard/contracts/${item.related_entity.id}`;
    case 'issue':
      return `/dashboard/issues?selected=${item.related_entity.id}`;
    case 'request':
      return `/dashboard/requests?selected=${item.related_entity.id}`;
    default:
      return null;
  }
}

function getInvitationTone(invitation: CustomerProjectParticipantInvitation): 'primary' | 'neutral' | 'success' | 'warning' {
  switch (invitation.status) {
    case 'accepted':
      return 'success';
    case 'cancelled':
    case 'declined':
    case 'expired':
      return 'neutral';
    default:
      return 'warning';
  }
}

function getAvailabilityLabel(item: CustomerOrganizationSearchItem): string {
  if (item.availability_status.already_participant) {
    return 'Уже участвует в проекте';
  }

  if (item.availability_status.pending_invitation) {
    return 'Приглашение уже отправлено';
  }

  return 'Можно пригласить';
}

export function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { canAccess } = usePermissions();
  const canViewFinance = canAccess({ permission: 'customer.finance.view' });

  const [workspace, setWorkspace] = useState<ProjectWorkspaceResponse['workspace'] | null>(null);
  const [participantsState, setParticipantsState] = useState<CustomerProjectParticipantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationForm, setInvitationForm] = useState<InvitationFormState>(initialInvitationForm);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isSubmittingInvitation, setIsSubmittingInvitation] = useState(false);
  const [invitationActionId, setInvitationActionId] = useState<number | null>(null);
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [organizationSearchResults, setOrganizationSearchResults] = useState<CustomerOrganizationSearchItem[]>([]);
  const [isSearchingOrganizations, setIsSearchingOrganizations] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(projectId)) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [nextWorkspace, nextParticipants] = await Promise.all([
          customerPortalService.getProjectWorkspace(projectId),
          customerPortalService.getProjectParticipants(projectId),
        ]);

        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setParticipantsState(nextParticipants);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить проект.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!participantsState?.can_manage || organizationQuery.trim().length < 2) {
      setOrganizationSearchResults([]);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setIsSearchingOrganizations(true);

      try {
        const items = await customerPortalService.searchProjectOrganizations(projectId, {
          query: organizationQuery.trim(),
          role: invitationForm.role,
        });

        if (!cancelled) {
          setOrganizationSearchResults(items);
        }
      } catch (searchError) {
        if (!cancelled) {
          setInvitationError(searchError instanceof Error ? searchError.message : 'Не удалось выполнить поиск организаций.');
        }
      } finally {
        if (!cancelled) {
          setIsSearchingOrganizations(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void runSearch();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [invitationForm.role, organizationQuery, participantsState?.can_manage, projectId]);

  const allowedRoles = participantsState?.allowed_roles ?? [];
  const canManageParticipants = participantsState?.can_manage ?? false;
  const project = workspace?.project;
  const documents = workspace?.documents.items ?? [];
  const approvals = workspace?.approvals.items ?? [];
  const timeline = workspace?.timeline ?? [];
  const riskCenter = workspace?.risk_center;

  if (!Number.isFinite(projectId)) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  if (!isLoading && !workspace) {
    return <Navigate to="/dashboard/projects" replace />;
  }

  async function reloadParticipants() {
    const nextParticipants = await customerPortalService.getProjectParticipants(projectId);
    setParticipantsState(nextParticipants);
  }

  function handleSelectOrganization(item: CustomerOrganizationSearchItem) {
    setInvitationForm((current) => ({
      ...current,
      organization_id: item.id,
      organization_name: item.name,
      email: item.email ?? current.email,
      inn: item.inn ?? current.inn,
      phone: item.phone ?? current.phone,
    }));
    setOrganizationQuery(item.name);
    setOrganizationSearchResults([]);
  }

  function resetSelectedOrganization() {
    setInvitationForm((current) => ({
      ...current,
      organization_id: undefined,
      organization_name: '',
      email: '',
      inn: '',
      phone: '',
    }));
    setOrganizationQuery('');
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvitationError(null);
    setIsSubmittingInvitation(true);

    try {
      await customerPortalService.createProjectInvitation(projectId, {
        role: invitationForm.role,
        organization_id: invitationForm.organization_id,
        organization_name: invitationForm.organization_name.trim() || undefined,
        email: invitationForm.email.trim() || undefined,
        inn: invitationForm.inn.trim() || undefined,
        contact_name: invitationForm.contact_name.trim() || undefined,
        phone: invitationForm.phone.trim() || undefined,
        message: invitationForm.message.trim() || undefined,
      });

      setInvitationForm(initialInvitationForm);
      setOrganizationQuery('');
      setOrganizationSearchResults([]);
      await reloadParticipants();
    } catch (submitError) {
      setInvitationError(submitError instanceof Error ? submitError.message : 'Не удалось отправить приглашение.');
    } finally {
      setIsSubmittingInvitation(false);
    }
  }

  async function handleInvitationAction(invitationId: number, action: 'cancel' | 'resend') {
    setInvitationActionId(invitationId);
    setInvitationError(null);

    try {
      if (action === 'cancel') {
        await customerPortalService.cancelProjectInvitation(projectId, invitationId);
      } else {
        await customerPortalService.resendProjectInvitation(projectId, invitationId);
      }

      await reloadParticipants();
    } catch (actionError) {
      setInvitationError(actionError instanceof Error ? actionError.message : 'Не удалось обновить приглашение.');
    } finally {
      setInvitationActionId(null);
    }
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Project workspace"
        title={project?.name ?? 'Загрузка проекта'}
        description="Паспорт проекта, ключевые договоры, документы, согласования, риски и участники на одном экране."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="detail-hero">
        <div>
          <StatusPill tone="primary">{project?.phase ?? 'Подготовка данных'}</StatusPill>
          <h2>{project?.location ?? 'Адрес уточняется'}</h2>
          <p>{project?.description ?? project?.leadLabel ?? 'Собираем данные по проекту для заказчика.'}</p>
          <p>
            <Link to={`/dashboard/issues?project_id=${projectId}`}>Создать замечание</Link>
            {' • '}
            <Link to={`/dashboard/requests?project_id=${projectId}`}>Создать запрос</Link>
            {' • '}
            <Link to={`/dashboard/contracts?project_id=${projectId}`}>Открыть договоры проекта</Link>
          </p>
        </div>
        <div className="detail-kpis">
          <div>
            <small>Готовность</small>
            <strong>{project ? `${project.completion}%` : '—'}</strong>
          </div>
          <div>
            <small>Документы</small>
            <strong>{workspace?.summary.documents_total ?? '—'}</strong>
          </div>
          <div>
            <small>Согласования</small>
            <strong>{workspace?.summary.approvals_total ?? '—'}</strong>
          </div>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Паспорт проекта</h3>
          </div>
          <div className="profile-list">
            <div>
              <span>Статус</span>
              <strong>{project?.status ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Ответственный</span>
              <strong>{project?.leadLabel ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Заказчик проекта</span>
              <strong>{project?.resolved_customer?.name ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Старт</span>
              <strong>{formatDate(project?.startDate)}</strong>
            </div>
            <div>
              <span>Завершение</span>
              <strong>{formatDate(project?.endDate)}</strong>
            </div>
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Проблемные зоны</h3>
            <Link to="/dashboard/risks">Все риски</Link>
          </div>
          {riskCenter?.flags?.length ? (
            <div className="list-stack">
              {riskCenter.flags.map((flag) => (
                <div key={flag} className="list-row">
                  <div>
                    <strong>{flag}</strong>
                    <p>
                      Актов без решения: {riskCenter.pending_approvals} • Документов без реакции:{' '}
                      {riskCenter.documents_without_reaction}
                    </p>
                  </div>
                  <StatusPill tone="warning">Риск</StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Критичных рисков по проекту сейчас нет.</p>
          )}
        </article>
      </section>

      {canViewFinance && project?.finance_summary ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>Финансы проекта</h3>
            <Link to="/dashboard/finance">Все финансы</Link>
          </div>
          <div className="profile-list">
            <div>
              <span>По договорам</span>
              <strong>{formatMoney(project.finance_summary.totals.total_amount)}</strong>
            </div>
            <div>
              <span>Выполнено</span>
              <strong>{formatMoney(project.finance_summary.totals.performed_amount)}</strong>
            </div>
            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(project.finance_summary.totals.paid_amount)}</strong>
            </div>
            <div>
              <span>Остаток</span>
              <strong>{formatMoney(project.finance_summary.totals.remaining_amount)}</strong>
            </div>
            <div>
              <span>Финансовое отклонение</span>
              <strong>{formatMoney(project.finance_summary.deviation.delta)}</strong>
            </div>
            <div>
              <span>Риск по оплате</span>
              <strong>{formatMoney(project.finance_summary.deviation.payment_delay_amount)}</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="plain-panel plain-panel--wide">
        <div className="panel-head">
          <h3>Участники проекта</h3>
          {canManageParticipants ? <StatusPill tone="primary">Можно приглашать</StatusPill> : null}
        </div>

        <div className="list-stack">
          {participantsState?.participants.length ? (
            participantsState.participants.map((participant) => (
              <div key={participant.id} className="list-row participant-row">
                <div>
                  <strong>{participant.name}</strong>
                  <p>
                    {participant.role_label}
                    {participant.inn ? ` • ИНН ${participant.inn}` : ''}
                    {participant.email ? ` • ${participant.email}` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <StatusPill tone={participant.is_owner ? 'primary' : 'neutral'}>
                    {participant.is_owner ? 'Владелец' : participant.role_label}
                  </StatusPill>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">Участники проекта еще не добавлены.</p>
          )}
        </div>

        <div className="panel-head panel-head--spaced">
          <h3>Приглашения</h3>
        </div>

        <div className="list-stack">
          {participantsState?.invitations.length ? (
            participantsState.invitations.map((invitation) => (
              <div key={invitation.id} className="list-row participant-row">
                <div>
                  <strong>{invitation.organization_name ?? invitation.invited_organization?.name ?? 'Организация'}</strong>
                  <p>
                    {invitation.role_label}
                    {invitation.email ? ` • ${invitation.email}` : ''}
                    {invitation.contact_name ? ` • ${invitation.contact_name}` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <StatusPill tone={getInvitationTone(invitation)}>{invitation.status}</StatusPill>
                  {canManageParticipants && invitation.status === 'pending' ? (
                    <div className="button-row button-row--compact">
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={invitationActionId === invitation.id}
                        onClick={() => void handleInvitationAction(invitation.id, 'resend')}
                      >
                        Повторить
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={invitationActionId === invitation.id}
                        onClick={() => void handleInvitationAction(invitation.id, 'cancel')}
                      >
                        Отменить
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">Активных приглашений по проекту пока нет.</p>
          )}
        </div>

        {canManageParticipants ? (
          <form className="inline-form invitation-form" onSubmit={handleInviteSubmit}>
            <div className="panel-head panel-head--spaced">
              <h3>Пригласить участника</h3>
            </div>

            <div className="form-grid form-grid--two">
              <label>
                <span>Роль</span>
                <select
                  value={invitationForm.role}
                  onChange={(event) => {
                    const role = event.target.value as InvitationFormState['role'];
                    setInvitationForm((current) => ({
                      ...current,
                      role,
                      organization_id: undefined,
                    }));
                    setOrganizationQuery('');
                    setOrganizationSearchResults([]);
                  }}
                >
                  {allowedRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Поиск организации</span>
                <input
                  value={organizationQuery}
                  onChange={(event) => {
                    setOrganizationQuery(event.target.value);
                    setInvitationForm((current) => ({
                      ...current,
                      organization_id: undefined,
                    }));
                  }}
                  placeholder="Название, email или ИНН"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={invitationForm.email}
                  onChange={(event) => setInvitationForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="contact@company.ru"
                  required={!invitationForm.organization_id}
                />
              </label>

              <label>
                <span>Организация</span>
                <input
                  value={invitationForm.organization_name}
                  onChange={(event) =>
                    setInvitationForm((current) => ({ ...current, organization_name: event.target.value }))
                  }
                  placeholder="ООО СтройКомпания"
                  required={!invitationForm.organization_id}
                />
              </label>

              <label>
                <span>Контактное лицо</span>
                <input
                  value={invitationForm.contact_name}
                  onChange={(event) =>
                    setInvitationForm((current) => ({ ...current, contact_name: event.target.value }))
                  }
                  placeholder="Имя и должность"
                />
              </label>

              <label>
                <span>ИНН</span>
                <input
                  value={invitationForm.inn}
                  onChange={(event) => setInvitationForm((current) => ({ ...current, inn: event.target.value }))}
                  placeholder="При наличии"
                />
              </label>

              <label>
                <span>Телефон</span>
                <input
                  value={invitationForm.phone}
                  onChange={(event) => setInvitationForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+7 ..."
                />
              </label>

              <label className="form-grid__wide">
                <span>Сообщение</span>
                <textarea
                  rows={4}
                  value={invitationForm.message}
                  onChange={(event) => setInvitationForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Кратко опишите, к какому проекту и в каком качестве вы приглашаете участника"
                />
              </label>
            </div>

            {invitationForm.organization_id ? (
              <div className="form-success">
                Выбрана организация: <strong>{invitationForm.organization_name}</strong>
                <button type="button" className="ghost-button" onClick={resetSelectedOrganization}>
                  Сбросить выбор
                </button>
              </div>
            ) : null}

            {organizationQuery.trim().length >= 2 ? (
              <div className="search-results">
                {isSearchingOrganizations ? (
                  <p className="empty-state">Ищем организации...</p>
                ) : organizationSearchResults.length ? (
                  organizationSearchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="search-result-card"
                      disabled={!item.availability_status.can_invite}
                      onClick={() => handleSelectOrganization(item)}
                    >
                      <strong>{item.name}</strong>
                      <span>
                        {item.email ? `${item.email} • ` : ''}
                        {item.inn ? `ИНН ${item.inn}` : 'Реквизиты уточняются'}
                      </span>
                      <span>{getAvailabilityLabel(item)}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Подходящих организаций не найдено. Можно отправить приглашение вручную.</p>
                )}
              </div>
            ) : null}

            {invitationError ? <div className="form-error">{invitationError}</div> : null}

            <div className="button-row">
              <button type="submit" disabled={isSubmittingInvitation}>
                {isSubmittingInvitation ? 'Отправляем приглашение...' : 'Пригласить участника'}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Ключевые договоры</h3>
            <Link to={`/dashboard/contracts?project_id=${projectId}`}>Все договоры проекта</Link>
          </div>
          <div className="list-stack">
            {project?.key_contracts?.length ? (
              project.key_contracts.map((contract) => (
                <div key={contract.id} className="list-row">
                  <div>
                    <strong>
                      <Link to={`/dashboard/contracts/${contract.id}?project_id=${projectId}`}>{contract.number}</Link>
                    </strong>
                    <p>{contract.subject ?? 'Предмет договора уточняется'}</p>
                  </div>
                  <StatusPill tone="primary">{formatMoney(contract.total_amount)}</StatusPill>
                </div>
              ))
            ) : (
              <p className="empty-state">По проекту пока нет договоров заказчика.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>Документы и согласования</h3>
          </div>
          <div className="list-stack">
            {documents.slice(0, 3).map((item) => (
              <div key={`doc-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.uploadedAtLabel ?? 'Без даты'}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&file_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
            {approvals.slice(0, 3).map((item) => (
              <div key={`approval-${item.id}`} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.contractNumber ?? item.projectName}</p>
                </div>
                <Link to={`/dashboard/issues?project_id=${projectId}&performance_act_id=${item.id}`}>Замечание</Link>
              </div>
            ))}
            {!documents.length && !approvals.length ? (
              <p className="empty-state">По проекту пока нет документов и согласований.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Последние события</h3>
        </div>
        <div className="list-stack">
          {timeline.length ? (
            timeline.map((item) => {
              const link = getTimelineLink(item);

              return (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>{link ? <Link to={link}>{item.title}</Link> : item.title}</strong>
                    <p>{item.subtitle ?? 'Событие по проекту'}</p>
                  </div>
                  <div className="row-actions">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : 'Без даты'}</span>
                    <StatusPill tone={item.priority === 'critical' || item.priority === 'warning' ? 'warning' : 'primary'}>
                      {item.status}
                    </StatusPill>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty-state">Последних событий по проекту пока нет.</p>
          )}
        </div>
      </section>
    </div>
  );
}
