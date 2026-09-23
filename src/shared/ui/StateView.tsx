interface StateViewProps {
  state: 'loading' | 'error' | 'empty';
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const defaultTitles: Record<StateViewProps['state'], string> = {
  loading: 'Загружаем данные',
  error: 'Не удалось загрузить данные',
  empty: 'Пока нет данных',
};

export function StateView({ state, title, description, onRetry }: StateViewProps) {
  return (
    <div className={`ui-state-view ui-state-view--${state}`} role={state === 'error' ? 'alert' : 'status'} aria-live="polite">
      <strong>{title ?? defaultTitles[state]}</strong>
      {description ? <p>{description}</p> : null}
      {state === 'error' && onRetry ? <button className="ui-button ui-button--secondary" type="button" onClick={onRetry}>Повторить</button> : null}
    </div>
  );
}
