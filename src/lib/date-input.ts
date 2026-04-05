const INPUT_DATE_FORMATTER = new Intl.DateTimeFormat('fi-FI', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Helsinki',
});

export function getDateInputValue(timestamp: number): string {
  const parts = INPUT_DATE_FORMATTER.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value: string): number | null {
  const [year, month, day] = value.split('-').map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return Date.UTC(year, month - 1, day, 12);
}
