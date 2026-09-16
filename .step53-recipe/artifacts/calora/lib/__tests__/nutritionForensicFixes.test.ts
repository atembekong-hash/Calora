import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Profile } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { validatePersonalDetails, validateTargetWeight } from '@/lib/profileTargets';

const profile: Profile = {
  name: 'Alex',
  goal: 'lose',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 172,
  weightKg: 80,
  targetWeightKg: 70,
  age: 31,
  calorieTarget: 2100,
  targetMode: 'custom',
  proteinTargetGrams: 177,
  carbsTargetGrams: 233,
  fatTargetGrams: 71,
};

describe('nutrition and personal-detail forensic regressions', () => {
  it('atomically marks a Home macro save as custom', () => {
    const source = readFileSync(resolve(__dirname, '../../app/(tabs)/index.tsx'), 'utf8');
    const save = source.slice(source.indexOf('const saveMacroGoals'), source.indexOf('const handleLivingAction'));
    expect(save).toContain("targetMode: 'custom'");
    expect(save.match(/updateProfile\(\{/g)).toHaveLength(1);
  });

  it('blocks invalid onboarding details before recommendation or persistence', () => {
    const validInput = {
      age: '31',
      height: '172',
      weight: '80',
      targetWeight: '70',
      activity: 'moderate' as const,
      diet: 'Everything' as const,
      goal: 'lose' as const,
    };
    const invalidCases = [
      { patch: { age: '12' }, message: 'Enter an age from 13 to 120.' },
      { patch: { height: '79' }, message: 'Enter a height from 80 to 260 cm.' },
      { patch: { weight: '24' }, message: 'Enter a current weight from 25 to 350 kg.' },
      { patch: { targetWeight: '351' }, message: 'Enter a target weight from 25 to 350 kg.' },
    ];
    invalidCases.forEach(({ patch, message }) => {
      expect(validatePersonalDetails({ ...validInput, ...patch }, 'metric')).toEqual({ ok: false, message });
    });

    const source = readFileSync(resolve(__dirname, '../../app/index.tsx'), 'utf8');
    expect(source).toContain('if (!validatedPersonalDetails.ok)');
    expect(source).toContain('if (!validation.ok)');
    expect(source).not.toContain('weightKg: Number(weight) || 76');
  });

  it('converts and range-checks an imperial Insights target', () => {
    const valid = validateTargetWeight('154.3234', 'imperial');
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.targetWeightKg).toBeCloseTo(70, 4);
    expect(validateTargetWeight('54.9', 'imperial')).toEqual({
      ok: false,
      message: 'Enter a target weight from 55 to 770 lb.',
    });
  });

  it('keeps the legacy pencil save name-only so automatic mode is preserved', () => {
    const source = readFileSync(resolve(__dirname, '../../app/(tabs)/profile.tsx'), 'utf8');
    const save = source.slice(source.indexOf('const saveProfileEdit'), source.indexOf('/** Saved meal creation'));
    expect(save).toContain('updateProfile({ name: editName.trim() })');
    expect(save).not.toContain('targetMode');
    expect(save).not.toContain('calorieTarget');
  });

  it('uses explicit custom macros in intelligence target facts', () => {
    const context = createIntelligenceContext({
      logs: [],
      profile,
      weights: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      activityMinutesLogs: {},
      plannerMeals: [],
      shoppingItems: [],
      localRecipes: [],
    }, { date: '2026-08-20', timezone: 'UTC' });
    const facts = buildDailyIntelligenceFacts(context);
    const value = (type: string) => facts.find((item) => item.factType === type)?.value;
    expect(value('daily.protein_target')).toBe(177);
    expect(value('daily.carbohydrates_target')).toBe(233);
    expect(value('daily.fat_target')).toBe(71);
  });
});