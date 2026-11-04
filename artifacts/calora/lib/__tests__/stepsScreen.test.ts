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

  it('opens from the Today Steps widget without replacing health actions', () => {
    expect(homeScreen).toContain('accessibilityLabel="Open Steps"');
    expect(homeScreen).toContain("onOpenSteps={() => router.push({ pathname: '/steps' } as never)}");
    expect(homeScreen).toContain('testID="dashboard-steps-action"');
  });
});
