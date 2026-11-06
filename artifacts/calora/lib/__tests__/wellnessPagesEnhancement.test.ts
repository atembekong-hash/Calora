import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fasting = readFileSync(resolve(__dirname, '../../app/fasting.tsx'), 'utf8');
const steps = readFileSync(resolve(__dirname, '../../app/steps.tsx'), 'utf8');
const hydration = readFileSync(resolve(__dirname, '../../app/hydration.tsx'), 'utf8');

describe('wellness page enhancement contracts', () => {
  it('keeps Fasting centered on its large ring and adds the rhythm snapshot', () => {
    expect(fasting).toContain('ringOuter: {');
    expect(fasting).toContain('width: 226');
    expect(fasting).toContain('height: 226');
    expect(fasting).toContain('styles.rhythmSnapshot');
    expect(fasting).toContain('YOUR RHYTHM');
    expect(fasting).toContain('rhythmTrackFill');
    expect(fasting).toContain('rhythmInsight');
    expect(fasting).toContain('A gentle rhythm is here when it fits your day.');
  });

  it('keeps Steps centered on a large ring and adds movement-zone insight', () => {
    expect(steps).toContain('StepRing progress={progress} value={todaySteps} goal={dailyStepGoal} colors={colors} size={212}');
    expect(steps).toContain('styles.momentumBand');
    expect(steps).toContain('Today’s momentum');
    expect(steps).toContain("['Easy', '#38BDF8']");
    expect(steps).toContain("['Steady', '#8B5CF6']");
    expect(steps).toContain("['Active', '#F97316']");
    expect(steps).toContain("movementView, setMovementView");
    expect(steps).toContain('Your movement picture');
    expect(steps).toContain('best movement');
  });

  it('keeps Hydration responsive with a prominent ring and adds hydration rhythm insight', () => {
    expect(hydration).toContain('size={width < 360 ? 168 : 188}');
    expect(hydration).toContain('stylesForScale.rhythmCard');
    expect(hydration).toContain('Hydration rhythm');
    expect(hydration).toContain('days recorded');
    expect(hydration).toContain('to goal');
    expect(hydration).toContain('pacingLabel');
    expect(hydration).toContain('Seven-day consistency');
    expect(hydration).toContain('consistencyDays');
  });
});
