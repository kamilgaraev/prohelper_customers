import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { usePermissions } from '@shared/contexts/PermissionsContext';
import { CustomerProjectInvitationRegistryItem, ProjectPreview } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatDate, formatPercent } from '@shared/utils/format';

function getInvitationTone(status: string): 'primary' | 'neutral' | 'success' | 'warning' {
  switch (status) {
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

export function ProjectsPage() {
  const { canAccess } = usePermissions();
  const canManageProjects = canAccess({ permission: 'customer.projects.manage' });
  const canManageParticipants = canAccess({ permission: 'customer.projects.participants.manage' });

  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [invitations, setInvitations] = useState<CustomerProjectInvitationRegistryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [projectsResponse, invitationsResponse] = await Promise.all([
          customerPortalService.getProjects(),
          canManageParticipants ? customerPortalService.getProjectInvitations() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setProjects(projectsResponse);
          setInvitations(invitationsResponse);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить проекты.');
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
  }, [canManageParticipants]);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Projects"
        title="Портфель проектов заказчика"
        description="Создавайте проекты, контролируйте прогресс и управляйте приглашениями участников прямо из кабинета."
      />

      {canManageProjects ? (
        <div className="button-row">
          <Link className="auth-link-button" to="/dashboard/projects/new">
            Создать проект
          </Link>
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}

      <div className="project-rows">
        {(isLoading ? new Array(3).fill(null) : projects).map((project, index) => (
          <article key={project ? project.id : index} className="project-row">
            {project ? (
              <>
                <div>
                  <StatusPill tone="neutral">{project.phase}</StatusPill>
                  <h3>{project.name}</h3>
                  <p>{project.location || 'Адрес проекта уточняется'}</p>
                </div>
                <div className="project-row__meta">
                  <span>{project.budgetLabel}</span>
                  <span>{formatPercent(project.completion)}</span>
                </div>
                <div className="project-row__meta">
                  <small>{project.leadLabel || 'Ответственный не указан'}</small>
                  <Link to={`/dashboard/projects/${project.id}`}>Открыть</Link>
                </div>
              </>
            ) : (
              <div className="metric-placeholder" />
            )}
          </article>
        ))}
      </div>

      {canManageParticipants ? (
        <section className="plain-panel">
          <div className="panel-head">
            <h3>Приглашения по проектам</h3>
          </div>
          <div className="list-stack">
            {invitations.length ? (
              invitations.map((invitation) => (
                <div key={invitation.id} className="list-row">
                  <div>
                    <strong>{invitation.organization_name ?? 'Организация'}</strong>
                    <p>
                      {invitation.project?.name ?? 'Проект не указан'} • {invitation.role_label}
                      {invitation.email ? ` • ${invitation.email}` : ''}
                    </p>
                  </div>
                  <div className="row-actions">
                    <span>{formatDate(invitation.expires_at ?? invitation.accepted_at ?? invitation.cancelled_at)}</span>
                    <StatusPill tone={getInvitationTone(invitation.status)}>{invitation.status}</StatusPill>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">По проектам пока нет активных приглашений.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
