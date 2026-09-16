export type DateRange = {
  start: string;
  end: string;
};

export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLogTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function dateList(endDate = dateKey(), days = 7, offset = -(days - 1)): string[] {
  return Array.from({ length: days }, (_, index) => addDays(endDate, offset + index));
}

export function rollingDateRange(days: number, endDate = dateKey()): DateRange {
  return { start: addDays(endDate, -(days - 1)), end: endDate };
}

export function isDateInRange(value: string, range: DateRange): boolean {
  return value >= range.start && value <= range.end;
}
