import { describe, expect, it } from 'vitest';
import {
  PLAN_TYPES,
  findPlanType,
  planTypeForGeneration,
  type PlannerPreferences,
  type PlanTypeId,
} from '../planType';

// ---------------------------------------------------------------------------
// PLAN_TYPES catalog — completeness and shape
// ---------------------------------------------------------------------------

describe('PLAN_TYPES catalog: all required plan types exist with correct shape', () => {
  const REQUIRED_IDS: PlanTypeId[] = [
    'balanced-nutrition',
    'high-protein-power',
    'low-carb-living',
    'mediterranean-diet',
    'plant-based-week',
    'keto-kickstart',
    'intermittent-fasting',
    'budget-friendly',
    'quick-and-easy',
    'athletic-performance',
    'anti-inflammatory',
    'healthy-habits-week',
  ];

  it('contains exactly 12 plan types', () => {
    expect(PLAN_TYPES).toHaveLength(12);
  });

  it('contains all required plan type ids', () => {
    const ids = PLAN_TYPES.map((pt) => pt.id);
    for (const id of REQUIRED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('every plan type has a non-empty label, subtitle, icon, description, and aiPrompt', () => {
    for (const pt of PLAN_TYPES) {
      expect(pt.label.trim().length, `label missing for ${pt.id}`).toBeGreaterThan(0);
      expect(pt.subtitle.trim().length, `subtitle missing for ${pt.id}`).toBeGreaterThan(0);
      expect(pt.icon.trim().length, `icon missing for ${pt.id}`).toBeGreaterThan(0);
      expect(pt.description.trim().length, `description missing for ${pt.id}`).toBeGreaterThan(0);
      expect(pt.aiPrompt.trim().length, `aiPrompt missing for ${pt.id}`).toBeGreaterThan(0);
    }
  });

  it('all ids are unique — no duplicate plan type', () => {
    const ids = PLAN_TYPES.map((pt) => pt.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes Healthy Habits Week and NOT the scientifically unsafe "Metabolic Reset"', () => {
    const ids = PLAN_TYPES.map((pt) => pt.id);
    expect(ids).toContain('healthy-habits-week');
    // Confirm the replaced variant is absent — it should not appear under any id or label
    const labels = PLAN_TYPES.map((pt) => pt.label.toLowerCase());
    expect(labels.some((label) => label.includes('metabolic'))).toBe(false);
  });

  it('Healthy Habits Week subtitle matches the safe copy requirement', () => {
    const pt = PLAN_TYPES.find((p) => p.id === 'healthy-habits-week');
    expect(pt?.subtitle).toContain('fresh start');
  });
});

// ---------------------------------------------------------------------------
// findPlanType — lookup helper
// ---------------------------------------------------------------------------

describe('findPlanType: look up a plan type by id', () => {
  it('returns the correct plan type for a valid id', () => {
    const pt = findPlanType('high-protein-power');
    expect(pt).toBeDefined();
    expect(pt?.id).toBe('high-protein-power');
    expect(pt?.label).toBe('High Protein Power');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPlanType('not-a-real-plan')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(findPlanType('')).toBeUndefined();
  });

  it('is case-sensitive — mixed-case id does not match', () => {
    expect(findPlanType('Balanced-Nutrition')).toBeUndefined();
    expect(findPlanType('BALANCED-NUTRITION')).toBeUndefined();
  });

  it('returns the Mediterranean Diet plan type correctly', () => {
    const pt = findPlanType('mediterranean-diet');
    expect(pt?.label).toBe('Mediterranean Diet');
    expect(pt?.aiPrompt).toMatch(/Mediterranean/i);
  });
});

// ---------------------------------------------------------------------------
// PlannerPreferences data model — forward-compatible shape
// ---------------------------------------------------------------------------

describe('PlannerPreferences data model: forward-compatible primary + optional secondary', () => {
  it('accepts a primary-only preference (the common case)', () => {
    const prefs: PlannerPreferences = { primary: 'balanced-nutrition' };
    expect(prefs.primary).toBe('balanced-nutrition');
    expect(prefs.secondary).toBeUndefined();
  });

  it('accepts primary plus secondary modifiers (future extensibility)', () => {
    const prefs: PlannerPreferences = {
      primary: 'high-protein-power',
      secondary: ['budget-friendly', 'quick-and-easy'],
    };
    expect(prefs.primary).toBe('high-protein-power');
    expect(prefs.secondary).toEqual(['budget-friendly', 'quick-and-easy']);
  });

  it('secondary is optional — omitting it does not affect primary', () => {
    const prefs: PlannerPreferences = { primary: 'plant-based-week' };
    const { primary, secondary } = prefs;
    expect(primary).toBe('plant-based-week');
    expect(secondary).toBeUndefined();
  });

  it('null preference correctly gates generation — null means no selection made', () => {
    // Documents the invariant: when plannerPreferences is null the generate
    // button must be disabled and the user is prompted to choose a plan type.
    const prefs: PlannerPreferences | null = null;
    // The generate button is enabled only when prefs !== null
    const generateEnabled = prefs !== null;
    expect(generateEnabled).toBe(false);
  });

  it('any valid PlanTypeId can be used as primary', () => {
    const ids: PlanTypeId[] = [
      'balanced-nutrition',
      'high-protein-power',
      'low-carb-living',
      'mediterranean-diet',
      'plant-based-week',
      'keto-kickstart',
      'intermittent-fasting',
      'budget-friendly',
      'quick-and-easy',
      'athletic-performance',
      'anti-inflammatory',
      'healthy-habits-week',
    ];
    for (const id of ids) {
      const prefs: PlannerPreferences = { primary: id };
      expect(prefs.primary).toBe(id);
    }
  });
});

describe('planTypeForGeneration', () => {
  it('uses a just-confirmed Program for refresh instead of the previous render preference', () => {
    expect(planTypeForGeneration('high-protein-power', { primary: 'balanced-nutrition' })).toBe('high-protein-power');
  });

  it('uses the saved Program for ordinary generation', () => {
    expect(planTypeForGeneration(undefined, { primary: 'balanced-nutrition' })).toBe('balanced-nutrition');
  });
});

// ---------------------------------------------------------------------------
// AI prompt differentiation — different plan types produce distinct guidance
// ---------------------------------------------------------------------------

describe('AI prompt differentiation: each plan type produces materially different guidance', () => {
  it('High Protein Power prompt emphasises protein targets', () => {
    const pt = findPlanType('high-protein-power')!;
    expect(pt.aiPrompt).toMatch(/protein/i);
    expect(pt.aiPrompt).toMatch(/35|40/); // targets a specific protein percentage
  });

  it('Low Carb Living prompt explicitly deprioritises carbohydrate-heavy meals', () => {
    const pt = findPlanType('low-carb-living')!;
    expect(pt.aiPrompt).toMatch(/carbohydrate|carb/i);
    expect(pt.aiPrompt).toMatch(/minimis|avoid/i);
  });

  it('Plant-Based Week prompt restricts to vegetarian or vegan meals', () => {
    const pt = findPlanType('plant-based-week')!;
    expect(pt.aiPrompt).toMatch(/vegetarian|vegan/i);
    expect(pt.aiPrompt).toMatch(/no meat|without.*meat|no.*fish/i);
  });

  it('Quick & Easy prompt references preparation time as the primary criterion', () => {
    const pt = findPlanType('quick-and-easy')!;
    expect(pt.aiPrompt).toMatch(/prep|preparation|time/i);
    expect(pt.aiPrompt).toMatch(/shortest|20 minutes/i);
  });

  it('Intermittent Fasting prompt structures meals around an eating window', () => {
    const pt = findPlanType('intermittent-fasting')!;
    expect(pt.aiPrompt).toMatch(/fasting|eating window|breakfast/i);
    expect(pt.aiPrompt).toMatch(/lunch|dinner/i);
  });

  it('no two plan types share an identical aiPrompt', () => {
    const prompts = PLAN_TYPES.map((pt) => pt.aiPrompt);
    const uniquePrompts = new Set(prompts);
    expect(uniquePrompts.size).toBe(PLAN_TYPES.length);
  });

  it('Mediterranean Diet and Anti-Inflammatory prompts are distinct despite both emphasising vegetables', () => {
    const med = findPlanType('mediterranean-diet')!;
    const anti = findPlanType('anti-inflammatory')!;
    expect(med.aiPrompt).not.toBe(anti.aiPrompt);
    // Mediterranean references its specific style
    expect(med.aiPrompt).toMatch(/Mediterranean/i);
    // Anti-inflammatory references its specific foods
    expect(anti.aiPrompt).toMatch(/anti-inflammatory|omega|berri/i);
  });
});
