export function formatDateTime(value) {
  if (!value) return 'No data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No data';

  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
