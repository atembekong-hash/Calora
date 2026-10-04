import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Progress weekly health graphs', () => {
  const source = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');

  it('renders the requested seven-day steps, burned-calorie, and water charts in Trends', () => {
    expect(source).toContain('title="Steps trend"');
    expect(source).toContain('title="Calories burned"');
    expect(source).toContain('title="Water intake"');
    expect(source).toContain('Movement & hydration');
    expect(source).toContain('Seven-day range');
  });

  it('derives graphs from provider history and account-scoped water logs instead of default data', () => {
    expect(source).toContain('deriveWeeklyHealthTrend(healthHistoryAvailable ? healthConnection.snapshot?.dailyMetrics : undefined');
    expect(source).toContain("deriveWeeklyWaterTrend(remembered.waterLogs, todayKey)");
    expect(source).toContain('emptyMessage="Sync Health to show measured steps."');
    expect(source).toContain('emptyMessage="Sync Health to show active calories."');
    expect(source).toContain('emptyMessage="Log water to start your hydration graph."');
  });

  it('keeps every graph accessible through the shared chart summary', () => {
    expect(source).toContain('accessibilityRole="summary"');
    expect(source).toContain('No data yet');
  });
});
