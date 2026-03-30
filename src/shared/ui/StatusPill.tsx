interface StatusPillProps {
  tone: 'primary' | 'neutral' | 'success' | 'warning';
  children: string;
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

