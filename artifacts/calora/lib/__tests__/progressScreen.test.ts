import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../app/(tabs)/insights.tsx'),
  'utf8',
);

describe('Progress dashboard layout contracts', () => {
  it('removes the weekly-signal hero widget while preserving the Progress controls', () => {
    expect(source).not.toContain('WEEKLY SIGNAL');
    expect(source).not.toContain('THE BIGGER PICTURE');
    expect(source).not.toContain('Patterns, not pressure');
    expect(source).not.toContain('Make tomorrow easier.');
    expect(source).not.toContain('useHourlyHeaderImage');
    expect(source).not.toContain('heroParallaxStyle');
    expect(source).not.toContain('styles.heroHeader');

    const tabs = source.indexOf('testID="progress-section-tabs"');
    const pager = source.indexOf('<SwipeableSectionPager');
    expect(tabs).toBeGreaterThan(-1);
    expect(pager).toBeGreaterThan(tabs);
  });

  it('keeps the pantry control on Recipes rather than duplicating it in Progress', () => {
    expect(source).not.toContain('Open shopping list');
    expect(source).not.toContain('shopping-bag');
    expect(source).not.toContain('<ShoppingListSheet');
  });

  it('keeps Trend headers, date controls, and chart labels inside bounded scroll viewports', () => {
    expect(source).toContain("chartViewport: { width: '100%', overflow: 'hidden' }");
    expect(source).toContain("lineGraphViewport: { width: '100%', overflow: 'hidden' }");
    expect(source).toContain("lineGraphScroll: { width: '100%' }");
    expect(source).toContain('const contentWidth = Math.max(chartWidth, points.length * 48);');
    expect(source).toContain('sectionHeaderCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0');
    expect(source).toContain("healthTrendHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap'");
    expect(source).toContain('numberOfLines={1} style={[styles.lineGraphLabel');
  });

  it('keeps one accessible, viewport-bounded calorie graph rather than duplicating calorie visuals', () => {
    expect(source).toContain('title="Calorie trend"');
    expect(source).toContain('points={calorieRangePoints}');
    expect(source).toContain('style={styles.lineGraphViewport}');
    expect(source).toContain('style={styles.lineGraphScroll}');
    expect(source).not.toContain('const [nutritionChartWidth, setNutritionChartWidth] = useState(0);');
    expect(source).not.toContain('const nutritionChartContentWidth = Math.max(nutritionChartWidth, calorieRangePoints.length * 40);');
    expect(source).not.toContain('style={[styles.chart, { width: nutritionChartContentWidth }]}');
  });

  it('preserves an explicit calendar range while refreshing only the default rolling range', () => {
    expect(source).toContain('const [graphRangeSelection, setGraphRangeSelection] = useState(() => createRollingSevenDaySelection());');
    expect(source).toContain('refreshRollingGraphRange(current, todayKey)');
    expect(source).toContain('setGraphRangeSelection(createCustomGraphRangeSelection(range))');
    expect(source).not.toContain('selectedDays === 7');
  });

  it('renders a date-range-aware Workout sessions chart from Health records', () => {
    expect(source).toContain('deriveWorkoutTrend(healthConnection.snapshot?.workouts, graphRange)');
    expect(source).toContain('title="Workout sessions"');
    expect(source).toContain('points={workoutRangePoints}');
    expect(source).toContain('Sync Health to show recorded workout sessions.');
  });

  it('uses the Progress-only weight selector so recorded data, baseline, source, and stale context stay distinct', () => {
    expect(source).toContain("from '@/lib/progressWeightSummary'");
    expect(source).toContain('selectProgressWeightSummary(weights');
    expect(source).toContain('Onboarding baseline · not a recorded weigh-in');
    expect(source).toContain('No weigh-in yet');
    expect(source).toContain('This is your latest recorded weigh-in.');
    expect(source).toContain('progressWeightSourceLabel(entry.source, healthConnection.provider)');
    expect(source).not.toContain('profile?.weightKg ?? 76');
    expect(source).not.toContain('const weightDelta = latestWeight - firstLoggedWeight');
  });

  it('retains one shared date control for the Trends period', () => {
    expect((source.match(/GraphDateRangePicker range=\{graphRange\}/g) ?? [])).toHaveLength(1);
    expect(source).toContain('Uses the same selected period as nutrition above.');
  });
});
