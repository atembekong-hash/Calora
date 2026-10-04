import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { plannerWeekDaysForDate } from '@/data/planner';

describe('recipe plan target week', () => {
  it('keeps a future Planner slot visible in its own Monday-through-Sunday week', () => {
    expect(plannerWeekDaysForDate('2026-10-11')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('keeps a prior-week Planner slot visible instead of anchoring to today', () => {
    expect(plannerWeekDaysForDate('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('wires the recipe plan picker to the selected plan day rather than the current calendar week', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('plannerWeekDaysForDate(planDay)');
    expect(source).toContain('{planPickerDays.map((day) => {');
    expect(source).not.toContain('plannerDate(getPlannerWeekStart(), index)');
  });
});
