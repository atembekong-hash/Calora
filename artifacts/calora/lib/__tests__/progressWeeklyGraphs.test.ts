import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Progress weekly health graphs', () => {
  const source = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');

	it('renders the requested seven-day steps, burned-calorie, and water metrics in Trends', () => {
		expect(source).toContain('title="Steps"');
		expect(source).toContain('title="Burned"');
		expect(source).toContain('title="Water"');
		expect(source).toContain('title="Active time"');
		expect(source).toContain('MacroTrendGraph');
		expect(source).toContain('Movement & hydration');
		expect(source).toContain('GraphDateRangePicker');
  });

  it('derives graphs from provider history and account-scoped water logs instead of default data', () => {
    expect(source).toContain('deriveHealthTrend(healthHistoryAvailable ? healthConnection.snapshot?.dailyMetrics : undefined');
    expect(source).toContain('deriveWaterTrend(remembered.waterLogs, graphRange)');
		expect(source).toContain('emptyMessage="Connect Health"');
		expect(source).toContain('emptyMessage="Log water"');
  });

  it('keeps every graph accessible through the shared chart summary', () => {
    expect(source).toContain('accessibilityRole="summary"');
    expect(source).toContain('No data yet');
  });

  it('uses the shared date-range picker for every chart range without allowing its label to force overflow', () => {
    const picker = readFileSync(resolve(__dirname, '../../components/GraphDateRangePicker.tsx'), 'utf8');
    expect(source).toContain('GraphDateRangePicker range={graphRange}');
    expect(picker).toContain('numberOfLines={1}');
    expect(picker).toContain('ellipsizeMode="tail"');
    expect(picker).toContain('triggerText: { flexShrink: 1');
  });
});
