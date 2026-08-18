import { describe, expect, it } from 'vitest';
import {
  PLAN_TYPES,
  clearProgramApplication,
  findPlanType,
  isStarterFallbackProvider,
  recordGenerationOutcome,
  resolveGenerationRecording,
  normalizePlannerPreferences,
  planTypeForGeneration,
  programAppliedToWeek,
  recordProgramApplication,
  selectPrimaryProgram,
  type PlannerPreferences,
  type PlanTypeId,
  type ProgramApplication,
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
// Program application records — per-week history of what shaped each week
// ---------------------------------------------------------------------------

const application = (weekStart: string, programId: PlanTypeId, source: ProgramApplication['source'] = 'build'): ProgramApplication => ({
  weekStart,
  programId,
  appliedAt: '2026-08-18T10:00:00.000Z',
  source,
});

describe('recordProgramApplication: persists which Program shaped a generated week', () => {
  it('adds a record while preserving primary and secondary untouched', () => {
    const prefs: PlannerPreferences = { primary: 'high-protein-power', secondary: ['budget-friendly'] };
    const next = recordProgramApplication(prefs, application('2026-08-17', 'high-protein-power'));
    expect(next.primary).toBe('high-protein-power');
    expect(next.secondary).toEqual(['budget-friendly']);
    expect(next.appliedPrograms).toEqual([application('2026-08-17', 'high-protein-power')]);
    // Input is not mutated
    expect(prefs.appliedPrograms).toBeUndefined();
  });

  it('keeps one record per week — a rebuild replaces the earlier application for that week', () => {
    let prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-17', 'balanced-nutrition'));
    prefs = recordProgramApplication(prefs, application('2026-08-17', 'keto-kickstart', 'refresh'));
    expect(prefs.appliedPrograms).toHaveLength(1);
    expect(prefs.appliedPrograms?.[0].programId).toBe('keto-kickstart');
    expect(prefs.appliedPrograms?.[0].source).toBe('refresh');
  });

  it('keeps past weeks unambiguous when a different Program is applied to a later week', () => {
    let prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-10', 'balanced-nutrition'));
    prefs = recordProgramApplication({ ...prefs, primary: 'plant-based-week' }, application('2026-08-17', 'plant-based-week'));
    expect(programAppliedToWeek(prefs, '2026-08-10')?.programId).toBe('balanced-nutrition');
    expect(programAppliedToWeek(prefs, '2026-08-17')?.programId).toBe('plant-based-week');
  });

  it('sorts records by weekStart regardless of insertion order', () => {
    let prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-24', 'balanced-nutrition'));
    prefs = recordProgramApplication(prefs, application('2026-08-10', 'keto-kickstart'));
    expect(prefs.appliedPrograms?.map((r) => r.weekStart)).toEqual(['2026-08-10', '2026-08-24']);
  });

  it('bootstraps preferences from null without inventing extra state', () => {
    const next = recordProgramApplication(null, application('2026-08-17', 'quick-and-easy'));
    expect(next.primary).toBe('quick-and-easy');
    expect(next.appliedPrograms).toHaveLength(1);
  });
});

describe('recordGenerationOutcome: fill builds never rewrite established provenance', () => {
  it('A-generated week → select B for future → ordinary Build week keeps the A record', () => {
    // Week generated under Program A
    let prefs = recordGenerationOutcome(
      { primary: 'balanced-nutrition' },
      application('2026-08-10', 'balanced-nutrition'),
      'fill',
    );
    // User selects B for future builds, then taps ordinary Build week on the A week
    prefs = selectPrimaryProgram(prefs, 'keto-kickstart');
    prefs = recordGenerationOutcome(prefs, application('2026-08-10', 'keto-kickstart'), 'fill');
    expect(programAppliedToWeek(prefs, '2026-08-10')?.programId).toBe('balanced-nutrition');
    expect(prefs.primary).toBe('keto-kickstart');
  });

  it('an explicit confirmed rebuild replaces the week record', () => {
    let prefs = recordGenerationOutcome(
      { primary: 'balanced-nutrition' },
      application('2026-08-10', 'balanced-nutrition'),
      'fill',
    );
    prefs = recordGenerationOutcome(
      selectPrimaryProgram(prefs, 'keto-kickstart'),
      application('2026-08-10', 'keto-kickstart', 'refresh'),
      'rebuild',
    );
    expect(programAppliedToWeek(prefs, '2026-08-10')?.programId).toBe('keto-kickstart');
    expect(programAppliedToWeek(prefs, '2026-08-10')?.source).toBe('refresh');
  });

  it('a fill build establishes provenance for a week with no record yet', () => {
    const prefs = recordGenerationOutcome({ primary: 'quick-and-easy' }, application('2026-08-17', 'quick-and-easy'), 'fill');
    expect(programAppliedToWeek(prefs, '2026-08-17')?.programId).toBe('quick-and-easy');
  });
});

describe('in-flight Program switch: completion merges into latest preferences, never a stale snapshot', () => {
  // Simulates the planner screen's functional-update flow: preference state is a
  // ref and every write is an updater applied to the LATEST state, mirroring
  // updatePlannerPreferences in the app context.
  const makeStore = (initial: PlannerPreferences | null) => {
    let state = initial;
    return {
      get: () => state,
      update: (updater: (prev: PlannerPreferences | null) => PlannerPreferences | null) => { state = updater(state); },
    };
  };

  it('ordinary build under A + user selects B while pending → primary stays B, record shows A', () => {
    const store = makeStore({ primary: 'balanced-nutrition' });
    // generate() starts: captures programId A ('balanced-nutrition'), request in flight
    const programId: PlanTypeId = 'balanced-nutrition';
    // User selects B for the next build while the request is pending
    store.update((prev) => selectPrimaryProgram(prev, 'keto-kickstart'));
    // Request completes and records provenance via a latest-state update
    store.update((prev) => recordGenerationOutcome(prev, application('2026-08-17', programId), 'fill'));
    expect(store.get()?.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(store.get(), '2026-08-17')?.programId).toBe('balanced-nutrition');
  });

  it('confirmed rebuild with A + user selects B while pending → B survives, A is recorded for the week', () => {
    const store = makeStore({ primary: 'quick-and-easy' });
    // Confirmed rebuild starts: primary switched to A via functional update
    store.update((prev) => selectPrimaryProgram(prev, 'balanced-nutrition'));
    const programId: PlanTypeId = 'balanced-nutrition';
    // User selects B while the rebuild request is pending
    store.update((prev) => selectPrimaryProgram(prev, 'keto-kickstart'));
    // Rebuild completes
    store.update((prev) => recordGenerationOutcome(prev, application('2026-08-17', programId, 'refresh'), 'rebuild'));
    expect(store.get()?.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(store.get(), '2026-08-17')?.programId).toBe('balanced-nutrition');
  });

  it('fallback rebuild clear while a switch is pending keeps the newly selected primary', () => {
    let store = makeStore(recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-17', 'balanced-nutrition')));
    store.update((prev) => selectPrimaryProgram(prev, 'keto-kickstart'));
    store.update((prev) => clearProgramApplication(prev, '2026-08-17'));
    expect(store.get()?.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(store.get(), '2026-08-17')).toBeUndefined();
  });
});

describe('isStarterFallbackProvider: a 200 starter response is still a fallback', () => {
  it('recognizes the starter planner provider regardless of brand prefix or case', () => {
    expect(isStarterFallbackProvider('Calora starter planner')).toBe(true);
    expect(isStarterFallbackProvider('STARTER PLANNER')).toBe(true);
  });

  it('treats real AI providers and missing providers as non-fallback', () => {
    expect(isStarterFallbackProvider('Calora AI planner')).toBe(false);
    expect(isStarterFallbackProvider(undefined)).toBe(false);
  });
});

describe('resolveGenerationRecording: provenance follows what actually happened', () => {
  it('records a real Program-guided generation that changed the week', () => {
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'fill', changed: true, fallback: false })).toBe('record');
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'rebuild', changed: true, fallback: false })).toBe('record');
  });

  it('never records when nothing changed or no Program was requested', () => {
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'rebuild', changed: false, fallback: false })).toBe('none');
    expect(resolveGenerationRecording({ programId: undefined, mode: 'fill', changed: true, fallback: false })).toBe('none');
  });

  it('a server starter-fallback rebuild that changed the week clears the stale record instead of claiming the Program', () => {
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'rebuild', changed: true, fallback: true })).toBe('clear');
  });

  it('a fallback fill that only padded empty slots records nothing', () => {
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'fill', changed: true, fallback: true })).toBe('none');
  });

  it('a fallback that changed nothing leaves existing provenance intact', () => {
    expect(resolveGenerationRecording({ programId: 'keto-kickstart', mode: 'rebuild', changed: false, fallback: true })).toBe('none');
  });
});

describe('clearProgramApplication: a failed rebuild leaves no inaccurate claim', () => {
  it('removes only the affected week and keeps other history plus the primary switch', () => {
    let prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-10', 'balanced-nutrition'));
    prefs = recordProgramApplication(prefs, application('2026-08-17', 'balanced-nutrition'));
    const cleared = clearProgramApplication(selectPrimaryProgram(prefs, 'keto-kickstart'), '2026-08-17');
    expect(cleared?.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(cleared, '2026-08-17')).toBeUndefined();
    expect(programAppliedToWeek(cleared, '2026-08-10')?.programId).toBe('balanced-nutrition');
  });

  it('drops the appliedPrograms field entirely when the last record is cleared', () => {
    const prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-17', 'balanced-nutrition'));
    expect(clearProgramApplication(prefs, '2026-08-17')).toEqual({ primary: 'balanced-nutrition' });
  });

  it('is a no-op for preferences without a record for that week (including null)', () => {
    expect(clearProgramApplication(null, '2026-08-17')).toBeNull();
    const prefs: PlannerPreferences = { primary: 'balanced-nutrition' };
    expect(clearProgramApplication(prefs, '2026-08-17')).toBe(prefs);
  });
});

describe('selectPrimaryProgram: switching the next-build Program never loses history', () => {
  it('carries the per-week application history forward when the primary changes', () => {
    const prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-10', 'balanced-nutrition'));
    const switched = selectPrimaryProgram(prefs, 'keto-kickstart');
    expect(switched.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(switched, '2026-08-10')?.programId).toBe('balanced-nutrition');
  });

  it('preserves secondary modifiers across a primary switch', () => {
    const prefs: PlannerPreferences = { primary: 'high-protein-power', secondary: ['budget-friendly'] };
    expect(selectPrimaryProgram(prefs, 'quick-and-easy')).toEqual({ primary: 'quick-and-easy', secondary: ['budget-friendly'] });
  });

  it('bootstraps from null for a first-time selection', () => {
    expect(selectPrimaryProgram(null, 'plant-based-week')).toEqual({ primary: 'plant-based-week' });
  });

  it('Start-next-week then rebuild flow: one coherent object keeps both the new primary and the fresh record', () => {
    // Simulates the confirmed-rebuild path: base = selectPrimaryProgram(...), then
    // recordProgramApplication(base, ...) — a single write with no stale state.
    let prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-10', 'balanced-nutrition'));
    const base = selectPrimaryProgram(prefs, 'keto-kickstart');
    prefs = recordProgramApplication(base, application('2026-08-17', 'keto-kickstart', 'refresh'));
    expect(prefs.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(prefs, '2026-08-10')?.programId).toBe('balanced-nutrition');
    expect(programAppliedToWeek(prefs, '2026-08-17')?.programId).toBe('keto-kickstart');
  });

  it('a failed refresh recorded as offline-fallback still names the confirmed Program', () => {
    const base = selectPrimaryProgram({ primary: 'balanced-nutrition' }, 'keto-kickstart');
    const prefs = recordProgramApplication(base, application('2026-08-17', 'keto-kickstart', 'offline-fallback'));
    expect(prefs.primary).toBe('keto-kickstart');
    expect(programAppliedToWeek(prefs, '2026-08-17')?.source).toBe('offline-fallback');
  });
});

describe('programAppliedToWeek: distinguishes applied weeks from a future-week selection', () => {
  it('returns undefined for a week that was never generated — even when a Program is selected', () => {
    const prefs: PlannerPreferences = { primary: 'keto-kickstart' };
    expect(programAppliedToWeek(prefs, '2026-08-17')).toBeUndefined();
  });

  it('returns undefined for null preferences', () => {
    expect(programAppliedToWeek(null, '2026-08-17')).toBeUndefined();
  });

  it('a changed future selection does not rewrite what shaped a past week', () => {
    const prefs = recordProgramApplication({ primary: 'balanced-nutrition' }, application('2026-08-10', 'balanced-nutrition'));
    const switched: PlannerPreferences = { ...prefs, primary: 'keto-kickstart' };
    expect(programAppliedToWeek(switched, '2026-08-10')?.programId).toBe('balanced-nutrition');
  });
});

// ---------------------------------------------------------------------------
// normalizePlannerPreferences — hydration/migration compatibility
// ---------------------------------------------------------------------------

describe('normalizePlannerPreferences: legacy shapes hydrate without being rewritten', () => {
  it('passes a legacy primary-only preference through unchanged', () => {
    expect(normalizePlannerPreferences({ primary: 'balanced-nutrition' })).toEqual({ primary: 'balanced-nutrition' });
  });

  it('keeps legacy secondary modifiers', () => {
    expect(normalizePlannerPreferences({ primary: 'high-protein-power', secondary: ['budget-friendly'] }))
      .toEqual({ primary: 'high-protein-power', secondary: ['budget-friendly'] });
  });

  it('returns null for null, undefined, and non-object values', () => {
    expect(normalizePlannerPreferences(null)).toBeNull();
    expect(normalizePlannerPreferences(undefined)).toBeNull();
    expect(normalizePlannerPreferences('balanced-nutrition')).toBeNull();
  });

  it('returns null for an unknown primary so the user re-picks safely', () => {
    expect(normalizePlannerPreferences({ primary: 'metabolic-reset' })).toBeNull();
  });

  it('keeps valid appliedPrograms records and drops malformed entries individually', () => {
    const raw = {
      primary: 'balanced-nutrition',
      appliedPrograms: [
        application('2026-08-10', 'balanced-nutrition'),
        { weekStart: 'not-a-date', programId: 'balanced-nutrition', appliedAt: 'x', source: 'build' },
        { weekStart: '2026-08-17', programId: 'unknown-program', appliedAt: 'x', source: 'build' },
        { weekStart: '2026-08-24', programId: 'keto-kickstart', appliedAt: '2026-08-24T09:00:00.000Z', source: 'bogus' },
        application('2026-08-31', 'quick-and-easy', 'offline-fallback'),
      ],
    };
    const normalized = normalizePlannerPreferences(raw);
    expect(normalized?.appliedPrograms?.map((r) => r.weekStart)).toEqual(['2026-08-10', '2026-08-31']);
  });

  it('deduplicates records that claim the same week, keeping the first valid one', () => {
    const raw = {
      primary: 'balanced-nutrition',
      appliedPrograms: [
        application('2026-08-10', 'balanced-nutrition'),
        application('2026-08-10', 'keto-kickstart'),
      ],
    };
    expect(normalizePlannerPreferences(raw)?.appliedPrograms).toEqual([application('2026-08-10', 'balanced-nutrition')]);
  });

  it('omits appliedPrograms entirely when every persisted record is malformed', () => {
    const raw = { primary: 'balanced-nutrition', appliedPrograms: [{ nonsense: true }] };
    expect(normalizePlannerPreferences(raw)).toEqual({ primary: 'balanced-nutrition' });
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
