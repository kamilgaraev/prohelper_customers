export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
}
