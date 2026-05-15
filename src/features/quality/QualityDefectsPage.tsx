import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { customerPortalService } from '@shared/api/customerPortalService';
import { useAsyncValue } from '@shared/hooks/useAsyncValue';
import { QualityDefectItem } from '@shared/types/dashboard';
import { SectionHeading } from '@shared/ui/SectionHeading';
import { StatusPill } from '@shared/ui/StatusPill';

function statusTone(defect: QualityDefectItem): 'primary' | 'neutral' | 'success' | 'warning' {
  if (defect.workflow_summary?.meta?.overdue || defect.problem_flags?.some((flag) => flag.severity === 'warning')) {
    return 'warning';
  }

  if (defect.status === 'resolved') {
    return 'success';
  }

  if (defect.status === 'cancelled') {
    return 'neutral';
  }

  return 'primary';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('ru-RU') : 'Без срока';
}

export function QualityDefectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => ({
      project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
      status: searchParams.get('status') || undefined,
      severity: searchParams.get('severity') || undefined,
      overdue: searchParams.get('overdue') === '1' ? true : undefined,
    }),
    [searchParams]
  );
  const { value: defects, error } = useAsyncValue(
    () => customerPortalService.getQualityDefects(filters),
    [searchParams.toString()]
  );
  const [selectedDefect, setSelectedDefect] = useState<QualityDefectItem | null>(null);

  useEffect(() => {
    if (!defects?.length) {
      setSelectedDefect(null);
      return;
    }

    const selectedId = Number(searchParams.get('selected'));
    const nextSelected = selectedId ? defects.find((defect) => defect.id === selectedId) : undefined;

    if (nextSelected) {
      setSelectedDefect(nextSelected);
      return;
    }

    if (!selectedDefect || !defects.some((defect) => defect.id === selectedDefect.id)) {
      setSelectedDefect(defects[0]);
    }
  }, [defects, searchParams, selectedDefect]);

  const defectOptions = defects ?? [];

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Quality"
        title="Дефекты качества"
        description="Реестр замечаний по качеству с ответственными, сроками устранения и текущим статусом проверки."
      />

      {error ? <div className="form-error">{error}</div> : null}

      <section className="plain-panel">
        <div className="panel-head">
          <h3>Фильтры</h3>
        </div>
        <div className="profile-list">
          <label>
            <span>Статус</span>
            <select
              value={filters.status ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) {
                  next.set('status', event.target.value);
                } else {
                  next.delete('status');
                }
                setSearchParams(next);
              }}
            >
              <option value="">Все</option>
              <option value="open">Открыт</option>
              <option value="assigned">Назначен</option>
              <option value="in_progress">В работе</option>
              <option value="ready_for_review">На проверке</option>
              <option value="resolved">Закрыт</option>
              <option value="rejected">Возвращен</option>
            </select>
          </label>
          <label>
            <span>Критичность</span>
            <select
              value={filters.severity ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) {
                  next.set('severity', event.target.value);
                } else {
                  next.delete('severity');
                }
                setSearchParams(next);
              }}
            >
              <option value="">Любая</option>
              <option value="minor">Низкая</option>
              <option value="major">Существенная</option>
              <option value="critical">Критическая</option>
            </select>
          </label>
          <label>
            <span>Только просроченные</span>
            <input
              type="checkbox"
              checked={filters.overdue === true}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.checked) {
                  next.set('overdue', '1');
                } else {
                  next.delete('overdue');
                }
                setSearchParams(next);
              }}
            />
          </label>
        </div>
      </section>

      <section className="dual-columns">
        <article className="plain-panel">
          <div className="panel-head">
            <h3>Реестр дефектов</h3>
            <span>{defectOptions.length}</span>
          </div>
          <div className="list-stack">
            {defectOptions.length ? (
              defectOptions.map((defect) => (
                <button
                  key={defect.id}
                  type="button"
                  className="list-row"
                  onClick={() => {
                    setSelectedDefect(defect);
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set('selected', String(defect.id));
                      return next;
                    });
                  }}
                >
                  <div>
                    <strong>{defect.defect_number} · {defect.title}</strong>
                    <p>{defect.project?.name ?? 'Проект не указан'}</p>
                    <p>{defect.location_name ?? 'Локация не указана'} · срок: {formatDate(defect.due_date)}</p>
                  </div>
                  <StatusPill tone={statusTone(defect)}>{defect.status_label ?? defect.status}</StatusPill>
                </button>
              ))
            ) : (
              <p className="empty-state">Дефектов по выбранным условиям пока нет.</p>
            )}
          </div>
        </article>

        <article className="plain-panel">
          <div className="panel-head">
            <h3>{selectedDefect ? selectedDefect.defect_number : 'Детали дефекта'}</h3>
            {selectedDefect ? (
              <StatusPill tone={statusTone(selectedDefect)}>{selectedDefect.status_label ?? selectedDefect.status}</StatusPill>
            ) : null}
          </div>
          {selectedDefect ? (
            <>
              <div className="profile-list">
                <div>
                  <span>Название</span>
                  <strong>{selectedDefect.title}</strong>
                </div>
                <div>
                  <span>Проект</span>
                  <strong>{selectedDefect.project?.name ?? 'Не указан'}</strong>
                </div>
                <div>
                  <span>Подрядчик</span>
                  <strong>{selectedDefect.contractor?.name ?? 'Не указан'}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{selectedDefect.assigned_user?.name ?? 'Не назначен'}</strong>
                </div>
                <div>
                  <span>Критичность</span>
                  <strong>{selectedDefect.severity_label ?? selectedDefect.severity}</strong>
                </div>
                <div>
                  <span>Срок устранения</span>
                  <strong>{formatDate(selectedDefect.due_date)}</strong>
                </div>
                <div>
                  <span>Следующее действие</span>
                  <strong>{selectedDefect.workflow_summary?.next_action_label ?? 'Не требуется'}</strong>
                </div>
              </div>
              {selectedDefect.description ? <p>{selectedDefect.description}</p> : null}
              {selectedDefect.problem_flags?.length ? (
                <div className="list-stack">
                  {selectedDefect.problem_flags.map((flag) => (
                    <div key={`${flag.code}-${flag.target_id ?? selectedDefect.id}`} className="list-row">
                      <div>
                        <strong>{flag.severity === 'blocker' ? 'Блокер' : 'Внимание'}</strong>
                        <p>{flag.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="empty-state">Выберите дефект из реестра, чтобы посмотреть детали.</p>
          )}
        </article>
      </section>
    </div>
  );
}
