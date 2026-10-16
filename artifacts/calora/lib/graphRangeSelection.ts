import { rollingDateRange, type DateRange } from '@/lib/dates';

export type GraphRangeSelection =
  | { kind: 'rolling-seven-days'; range: DateRange }
  | { kind: 'custom'; range: DateRange };

export function createRollingSevenDaySelection(todayKey?: string): GraphRangeSelection {
  return { kind: 'rolling-seven-days', range: rollingDateRange(7, todayKey) };
}

export function createCustomGraphRangeSelection(range: DateRange): GraphRangeSelection {
  return { kind: 'custom', range };
}

/** Refreshes only the initial rolling mode; an explicit calendar choice remains authoritative. */
export function refreshRollingGraphRange(
  selection: GraphRangeSelection,
  todayKey: string,
): GraphRangeSelection {
  return selection.kind === 'rolling-seven-days'
    ? createRollingSevenDaySelection(todayKey)
    : selection;
}
