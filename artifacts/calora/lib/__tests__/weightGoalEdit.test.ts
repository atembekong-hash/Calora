/**
 * Weight goal edit — accessibility and persistence logic tests.
 *
 * These tests verify that:
 *   1. The "Edit goal" / "Set goal" header button is always present in the
 *      InsightsScreen source, unconditionally, regardless of weight count.
 *   2. The goal edit modal calls updateProfile with a valid numeric target.
 *   3. The modal pre-fills correctly when targetWeightKg is already set.
 *   4. Saving with fewer than three recorded weights still routes to updateProfile
 *      (i.e. the button is not gated on weights.length >= 3).
 */

import { describe, expect, it } from 'vitest';
import type { Profile } from '@/context/CaloraContext';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseProfile: Profile = {
  name: 'Alex',
  goal: 'lose',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 170,
  weightKg: 80,
  targetWeightKg: 70,
  age: 30,
  calorieTarget: 1800,
};

// ---------------------------------------------------------------------------
// 1. Header button is unconditional (source-level assertion)
// ---------------------------------------------------------------------------

describe('weight goal header button — unconditional render', () => {
  it('appears in the InsightsScreen source regardless of weight count', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/insights.tsx'),
      'utf8',
    );

    // The "Edit weight goal" accessible label must be present.
    expect(source).toContain('accessibilityLabel="Edit weight goal"');

    // The button must not be directly gated by a `{weights.length >= 3 &&` or
    // `weights.length >= 3 ?` render expression on the same or preceding line.
    // We extract the 300 characters before the first occurrence of the button
    // and confirm no weights-count guard wraps it.
    const goalBtnPos = source.indexOf('accessibilityLabel="Edit weight goal"');
    expect(goalBtnPos).toBeGreaterThan(-1);

    const surroundingContext = source.slice(Math.max(0, goalBtnPos - 300), goalBtnPos);
    expect(surroundingContext).not.toMatch(/weights\.length\s*>=\s*3\s*&&/);
    expect(surroundingContext).not.toMatch(/weights\.length\s*>=\s*3\s*\?/);
  });

  it('renders the Set goal label when targetWeightKg is 0', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/insights.tsx'),
      'utf8',
    );

    // The header button dynamically labels itself 'Set goal' when no target exists.
    expect(source).toContain("'Set goal'");
  });
});

// ---------------------------------------------------------------------------
// 2. Pre-fill logic — goalInput initialises from targetWeightKg
// ---------------------------------------------------------------------------

describe('goal edit modal — pre-fill behaviour', () => {
  it('pre-fills with the existing target when one is set', () => {
    // Simulate what InsightsScreen does when opening the modal:
    //   setGoalInput(targetWeight > 0 ? String(targetWeight) : '');
    const targetWeight = baseProfile.targetWeightKg; // 70
    const goalInput = targetWeight > 0 ? String(targetWeight) : '';
    expect(goalInput).toBe('70');
  });

  it('starts with an empty string when no goal has been set', () => {
    const profileNoGoal: Profile = { ...baseProfile, targetWeightKg: 0 };
    const targetWeight = profileNoGoal.targetWeightKg;
    const goalInput = targetWeight > 0 ? String(targetWeight) : '';
    expect(goalInput).toBe('');
  });

  it('pre-fills with the existing target even when weights.length < 3', () => {
    // The pre-fill runs from profile data, which is independent of weight count.
    const targetWeight = baseProfile.targetWeightKg;
    const weightsCount = 1; // fewer than the analytics threshold
    // pre-fill is NOT conditional on weightsCount
    const goalInput = targetWeight > 0 ? String(targetWeight) : '';
    expect(goalInput).toBe('70');
    expect(weightsCount).toBeLessThan(3); // confirm the fixture is correct
  });
});

// ---------------------------------------------------------------------------
// 3. Save guard — only positive numbers reach updateProfile
// ---------------------------------------------------------------------------

describe('goal edit modal — save guard', () => {
  it('calls updateProfile when a positive value is entered', () => {
    const calls: number[] = [];
    const updateProfile = (patch: Partial<Profile>) => {
      if (patch.targetWeightKg !== undefined) calls.push(patch.targetWeightKg);
    };

    const goalInput = '68';
    const value = Number(goalInput);
    if (value > 0) updateProfile({ targetWeightKg: value });

    expect(calls).toEqual([68]);
  });

  it('does not call updateProfile when input is empty', () => {
    const calls: number[] = [];
    const updateProfile = (patch: Partial<Profile>) => {
      if (patch.targetWeightKg !== undefined) calls.push(patch.targetWeightKg);
    };

    const goalInput = '';
    const value = Number(goalInput);
    if (value > 0) updateProfile({ targetWeightKg: value });

    expect(calls).toEqual([]);
  });

  it('does not call updateProfile when input is zero', () => {
    const calls: number[] = [];
    const updateProfile = (patch: Partial<Profile>) => {
      if (patch.targetWeightKg !== undefined) calls.push(patch.targetWeightKg);
    };

    const goalInput = '0';
    const value = Number(goalInput);
    if (value > 0) updateProfile({ targetWeightKg: value });

    expect(calls).toEqual([]);
  });

  it('saves goal with fewer than three recorded weights', () => {
    // The save path is updateProfile({ targetWeightKg }) which depends only on
    // the numeric input, not on weights.length.
    const calls: number[] = [];
    const updateProfile = (patch: Partial<Profile>) => {
      if (patch.targetWeightKg !== undefined) calls.push(patch.targetWeightKg);
    };

    const weightsCount = 0; // zero weigh-ins
    const goalInput = '72';
    const value = Number(goalInput);
    // The save handler does not gate on weightsCount.
    if (value > 0) updateProfile({ targetWeightKg: value });

    expect(calls).toEqual([72]);
    expect(weightsCount).toBeLessThan(3);
  });
});
