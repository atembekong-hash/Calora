import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const stepsScreen = readFileSync(resolve(process.cwd(), 'app/steps.tsx'), 'utf8');
const homeScreen = readFileSync(resolve(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

describe('Steps experience', () => {
  it('exposes a dedicated professional route with live and weekly movement surfaces', () => {
    expect(stepsScreen).toContain('export default function StepsScreen');
    expect(stepsScreen).toContain('StepRing');
    expect(stepsScreen).toContain('WeekBars');
    expect(stepsScreen).toContain('HourlyMovementChart');
    expect(stepsScreen).toContain('Movement by hour');
    expect(stepsScreen).toContain('Tap a bar to inspect your day');
    expect(stepsScreen).toContain('onPress={() => setSelectedIndex');
    expect(stepsScreen).toContain('healthConnection.snapshot?.hourlyMetrics');
    expect(stepsScreen).toContain('healthConnection.snapshot?.dailyMetrics');
    expect(stepsScreen).toContain('startLiveStepTracking');
    expect(stepsScreen).toContain('Connect your health data');
  });

  it('exposes compact weekly and monthly comparison controls without replacing the existing charts', () => {
    expect(stepsScreen).toContain('TrendComparison');
    expect(stepsScreen).toContain('Trend comparison');
    expect(stepsScreen).toContain("value === 'week' ? 'WEEK' : 'MONTH'");
    expect(stepsScreen).toContain('healthConnection.snapshot?.trendMetrics');
    expect(stepsScreen).toContain('Monthly comparison will appear after two complete 30-day periods.');
  });

  it('exposes an accessible daily goal editor backed by the shared persisted goal setter', () => {
    expect(stepsScreen).toContain('StepGoalSheet');
    expect(stepsScreen).toContain('setDailyStepGoal');
    expect(stepsScreen).toContain('Edit daily step goal');
    expect(stepsScreen).toContain('Daily step goal');
    expect(stepsScreen).toContain('Save daily step goal');
    expect(stepsScreen).toContain('STEP_GOAL_PRESETS');
    expect(stepsScreen).toContain('MIN_DAILY_STEP_GOAL');
    expect(stepsScreen).toContain('MAX_DAILY_STEP_GOAL');
    expect(stepsScreen).toContain('Choose a goal from');
  });

  it('connects Steps to walking guidance and related Learning suggestions', () => {
    expect(stepsScreen).toContain('Learn about walking');
    expect(stepsScreen).toContain('movement-breaks-count');
    expect(stepsScreen).toContain('Movement breaks count');
    expect(stepsScreen).toContain('movement-snacks');
    expect(stepsScreen).toContain('recovery-is-part-of-routine');
    expect(stepsScreen).toContain("pathname: '/learning/[lessonId]'");
    expect(stepsScreen).toContain('Open Movement breaks count lesson');
  });

  it('opens from the Today Steps widget without replacing health actions', () => {
    expect(homeScreen).toContain('accessibilityLabel="Open Steps"');
    expect(homeScreen).toContain("onOpenSteps={() => router.push({ pathname: '/steps' } as never)}");
    expect(homeScreen).toContain('testID="dashboard-steps-action"');
  });
});
