import { describe, expect, it } from 'vitest';
import {
  createCustomGraphRangeSelection,
  createRollingSevenDaySelection,
  refreshRollingGraphRange,
} from '../graphRangeSelection';

describe('graph range selection', () => {
  it('refreshes the initial rolling seven-day range when the local day changes', () => {
    expect(refreshRollingGraphRange(createRollingSevenDaySelection('2026-10-16'), '2026-10-17')).toEqual({
      kind: 'rolling-seven-days',
      range: { start: '2026-10-11', end: '2026-10-17' },
    });
  });

  it('preserves an explicit historical seven-day calendar selection', () => {
    const selected = createCustomGraphRangeSelection({
      start: '2026-09-01',
      end: '2026-09-07',
    });

    expect(refreshRollingGraphRange(selected, '2026-10-16')).toBe(selected);
  });
});
