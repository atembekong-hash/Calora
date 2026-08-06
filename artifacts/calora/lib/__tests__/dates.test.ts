import { describe, expect, it } from 'vitest';
import { addDays, dateFromKey, dateKey, dateList, rollingDateRange } from '@/lib/dates';

describe('local calendar dates', () => {
  it('formats and advances calendar dates without UTC rollover', () => {
    expect(dateKey(new Date(2026, 7, 6, 23, 45))).toBe('2026-08-06');
    expect(addDays('2026-08-06', 1)).toBe('2026-08-07');
    expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
    expect(dateKey(dateFromKey('2026-08-06'))).toBe('2026-08-06');
  });

  it('builds inclusive ranges in ascending order', () => {
    expect(dateList('2026-08-06', 3)).toEqual(['2026-08-04', '2026-08-05', '2026-08-06']);
    expect(rollingDateRange(7, '2026-08-06')).toEqual({ start: '2026-07-31', end: '2026-08-06' });
  });
});