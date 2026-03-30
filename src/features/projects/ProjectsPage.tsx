import { Link } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';
import { formatPercent } from '@shared/utils/format';

export function ProjectsPage() {
  const { value: projects, isLoading } = useAsyncValue(() => customerPortalService.getProjects(), []);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Projects"
        title="Портфель проектов заказчика"
        description="Только customer-safe обзор: фаза, прогресс, бюджет и ключевой исполнитель."
      />

      <div className="project-rows">
        {(isLoading ? new Array(3).fill(null) : projects ?? []).map((project, index) => (
          <article key={project ? project.id : index} className="project-row">
            {project ? (
              <>
                <div>
                  <StatusPill tone="neutral">{project.phase}</StatusPill>
                  <h3>{project.name}</h3>
                  <p>{project.location}</p>
                </div>
                <div className="project-row__meta">
                  <span>{project.budgetLabel}</span>
                  <span>{formatPercent(project.completion)}</span>
                </div>
                <div className="project-row__meta">
                  <small>{project.leadLabel}</small>
                  <Link to={`/dashboard/projects/${project.id}`}>Открыть</Link>
                </div>
              </>
            ) : (
              <div className="metric-placeholder" />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

